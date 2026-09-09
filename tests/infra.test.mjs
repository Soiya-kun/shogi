import test from 'node:test';
import {App} from 'aws-cdk-lib';
import {Template, Match} from 'aws-cdk-lib/assertions';
import {ShogiSiteStack} from '../infra/site-stack.mjs';

test('AWS site keeps S3 private and configures HTTPS, AI isolation, DNS and cache invalidation', () => {
  const app = new App();
  const stack = new ShogiSiteStack(app, 'TestSite', {
    env: {account: '830765133573', region: 'us-east-1'},
    domainName: 'shogi-battle.com', hostedZoneId: 'Z02626345FXOJIXOXAH9',
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true, BlockPublicPolicy: true,
      IgnorePublicAcls: true, RestrictPublicBuckets: true,
    },
    VersioningConfiguration: {Status: 'Enabled'},
  });
  template.hasResource('AWS::S3::Bucket', {DeletionPolicy: 'Retain'});
  template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
    OriginAccessControlConfig: Match.objectLike({SigningBehavior: 'always', SigningProtocol: 'sigv4'}),
  });
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: Match.objectLike({
      Aliases: ['shogi-battle.com'], DefaultRootObject: 'index.html',
      DefaultCacheBehavior: Match.objectLike({ViewerProtocolPolicy: 'redirect-to-https'}),
      CacheBehaviors: Match.arrayWith([Match.objectLike({PathPattern: '*.glb', ViewerProtocolPolicy: 'redirect-to-https'})]),
    }),
  });
  template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
    ResponseHeadersPolicyConfig: Match.objectLike({CustomHeadersConfig: {Items: Match.arrayWith([
      {Header: 'Cross-Origin-Opener-Policy', Value: 'same-origin', Override: true},
      {Header: 'Cross-Origin-Embedder-Policy', Value: 'require-corp', Override: true},
    ])}}),
  });
  template.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: 'shogi-battle.com', ValidationMethod: 'DNS',
  });
  template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
    ResponseHeadersPolicyConfig: Match.objectLike({CustomHeadersConfig: {Items: Match.arrayWith([
      {Header: 'Cross-Origin-Embedder-Policy', Value: 'require-corp', Override: true},
      {Header: 'Content-Type', Value: 'model/gltf-binary', Override: true},
    ])}}),
  });
  for (const Type of ['A', 'AAAA']) template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: 'shogi-battle.com.', Type, HostedZoneId: 'Z02626345FXOJIXOXAH9',
  });
  template.hasResourceProperties('Custom::CDKBucketDeployment', {
    DistributionPaths: ['/*'],
    SystemMetadata: Match.objectLike({'cache-control': 'public,max-age=0,s-maxage=3600,must-revalidate'}),
  });
});
