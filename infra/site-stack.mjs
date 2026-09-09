import {fileURLToPath} from 'node:url';
import {
  Stack, Duration, RemovalPolicy, Size, CfnOutput, Tags,
  aws_s3 as s3, aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins, aws_certificatemanager as acm,
  aws_route53 as route53, aws_route53_targets as targets,
  aws_s3_deployment as deployment,
} from 'aws-cdk-lib';

export class ShogiSiteStack extends Stack {
  constructor(scope, id, {domainName, hostedZoneId, ...props}) {
    super(scope, id, props);
    if (this.region !== 'us-east-1') throw new Error('CloudFront certificate stack must use us-east-1');
    Tags.of(this).add('Application', 'shogi-app');
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId, zoneName: domainName,
    });
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });
    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{noncurrentVersionExpiration: Duration.days(30)}],
    });
    const headersConfig = {
      customHeadersBehavior: {customHeaders: [
        {header: 'Cross-Origin-Opener-Policy', value: 'same-origin', override: true},
        {header: 'Cross-Origin-Embedder-Policy', value: 'require-corp', override: true},
        {header: 'Cross-Origin-Resource-Policy', value: 'same-origin', override: true},
      ]},
      securityHeadersBehavior: {
        contentTypeOptions: {override: true},
        strictTransportSecurity: {accessControlMaxAge: Duration.days(365), override: true},
      },
    };
    const headers = new cloudfront.ResponseHeadersPolicy(this, 'IsolationHeaders', headersConfig);
    // The deployment Lambda's MIME database does not recognize GLB; set its public response type explicitly.
    const modelHeaders = new cloudfront.ResponseHeadersPolicy(this, 'ModelHeaders', {
      ...headersConfig,
      customHeadersBehavior: {customHeaders: [
        ...headersConfig.customHeadersBehavior.customHeaders,
        {header: 'Content-Type', value: 'model/gltf-binary', override: true},
      ]},
    });
    // Files keep their original names. Revalidate in browsers and invalidate the CDN on each deploy.
    const cache = new cloudfront.CachePolicy(this, 'SiteCache', {
      minTtl: Duration.seconds(0), defaultTtl: Duration.hours(1), maxTtl: Duration.days(1),
      enableAcceptEncodingGzip: true, enableAcceptEncodingBrotli: true,
    });
    const behavior = {
      origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cache, responseHeadersPolicy: headers, compress: true,
    };
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [domainName], certificate, defaultRootObject: 'index.html',
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: behavior,
      additionalBehaviors: {'*.glb': {...behavior, responseHeadersPolicy: modelHeaders}},
    });
    for (const [name, Record] of [['AliasA', route53.ARecord], ['AliasAAAA', route53.AaaaRecord]]) {
      new Record(this, name, {zone, recordName: domainName,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution))});
    }
    new deployment.BucketDeployment(this, 'SiteFiles', {
      sources: [deployment.Source.asset(fileURLToPath(new URL('../dist/', import.meta.url)), {exclude: ['_headers']})],
      destinationBucket: bucket,
      distribution, distributionPaths: ['/*'],
      cacheControl: [deployment.CacheControl.fromString('public,max-age=0,s-maxage=3600,must-revalidate')],
      memoryLimit: 1024, ephemeralStorageSize: Size.gibibytes(1),
      retainOnDelete: true,
    });
    new CfnOutput(this, 'SiteUrl', {value: `https://${domainName}`});
    new CfnOutput(this, 'BucketName', {value: bucket.bucketName});
    new CfnOutput(this, 'DistributionId', {value: distribution.distributionId});
    new CfnOutput(this, 'CloudFrontDomain', {value: distribution.distributionDomainName});
  }
}
