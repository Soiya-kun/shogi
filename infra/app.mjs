import {App} from 'aws-cdk-lib';
import {ShogiSiteStack} from './site-stack.mjs';

const app = new App();
const account = app.node.tryGetContext('account');
if (process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_ACCOUNT !== account) {
  throw new Error(`Wrong AWS account: expected ${account}, received ${process.env.CDK_DEFAULT_ACCOUNT}`);
}
new ShogiSiteStack(app, 'ShogiBattleSite', {
  env: {account, region: app.node.tryGetContext('region')},
  domainName: app.node.tryGetContext('domainName'),
  hostedZoneId: app.node.tryGetContext('hostedZoneId'),
});
