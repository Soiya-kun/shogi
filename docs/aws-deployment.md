# AWSデプロイ

## 初回公開の確認結果（2026-09-06）

- `ShogiBattleSite`: `UPDATE_COMPLETE`
- ドメイン登録: `SUCCESSFUL`、ACM証明書: `ISSUED`
- CloudFront: `E3VUHI05ICUTJM` / `d2orm5jjb1ee9p.cloudfront.net`
- 配信バケット: `shogibattlesite-sitebucket397a1860-l4hjxuthdo35`
- 単体テスト52件成功。GLB配信設定追加後のインフラテストも成功。
- `npm run build`成功。
- `node scripts/verify-deployment.mjs`成功。HTML・JS・MJS・Worker・WASM・GLB・Service Worker・GPLライセンスのHTTP 200、主要MIME型、COOP/COEP、HTTP→HTTPS転送を確認。
- S3の`index.html`への匿名直接アクセスはHTTP 403。
- ブラウザ上の3D表示・AI着手の実動確認は未実施。

## 構成

- URL: https://shogi-battle.com
- AWSアカウント: `830765133573`（shogi-app）
- ローカルAWS CLIプロファイル: `shogi-app`
- SSO: https://d-9567a0fb7e.awsapps.com/start/#/
- SSOリージョン: `ap-northeast-1`、ロール: `AdministratorAccess`
- CDKスタック: `ShogiBattleSite`、リージョン: `us-east-1`
- 既存Route 53ホストゾーン: `Z02626345FXOJIXOXAH9`

非公開S3をCloudFront OAC経由で配信する。ACM証明書はDNS検証で発行し、Route 53にルートドメインのA/AAAAエイリアスを作る。CloudFront用証明書の配置先に合わせ、S3とデプロイ用Lambdaも含めて単一の`us-east-1`スタックで管理する。閲覧時はCloudFrontの各地のエッジから配信される。wwwサブドメインは設定していない。

`dist/`全体を配信する。AIのGPLライセンス・対応ソースも含む。`_headers`はAWSでは解釈されないため除外し、COOP/COEP/CORPをCloudFrontのレスポンスヘッダーポリシーで設定する。AWSへのアップロードは`assets/blender/`やリポジトリ全体を含まない。

ファイル名にハッシュがないため、ブラウザでは再検証、CloudFrontでは最大1時間の共有キャッシュとする。デプロイごとに`/*`を無効化する。S3のバージョニングを有効化し、非現行版は30日保持する。スタック削除時は配信バケットと内容を保持する。

GLBはデプロイ用LambdaのMIME判定では汎用バイナリになるため、`*.glb`のCloudFrontビヘイビアで`Content-Type: model/gltf-binary`を明示する。このビヘイビアにもAI用の分離ヘッダーを適用する。

## 初回設定

Node.js 22以降とAWS CLI v2を使用する。CDK CLIはnpm依存に固定している。

```powershell
aws configure set sso_start_url 'https://d-9567a0fb7e.awsapps.com/start/#/' --profile shogi-app
aws configure set sso_region ap-northeast-1 --profile shogi-app
aws configure set sso_account_id 830765133573 --profile shogi-app
aws configure set sso_role_name AdministratorAccess --profile shogi-app
aws configure set region ap-northeast-1 --profile shogi-app
aws sso login --profile shogi-app
aws sts get-caller-identity --profile shogi-app
npm ci
npm run cdk -- bootstrap aws://830765133573/us-east-1 --profile shogi-app
```

ドメイン登録とNS委任が完了していない場合、ACM証明書の作成はDNS検証待ちになる。Route 53のホストゾーンが存在するだけでは登録完了とは限らない。

## 更新

```powershell
aws sso login --profile shogi-app
npm test
npm run infra:synth
npm run infra:diff
npm run deploy
node scripts/verify-deployment.mjs
```

`npm run deploy`は配信アセットの検証後にCDKデプロイを行う。`cdk.json`のアカウントと実行プロファイルが異なる場合は停止する。`cdk-outputs.json`にURL・バケット名・CloudFront IDを出力する。認証情報をリポジトリへ保存しない。

公開後の検証スクリプトはHTTPS転送、主要ファイルのHTTPステータス、JavaScript/WASM/GLBのMIME型、AI用ヘッダーを確認する。画面表示・AI着手のブラウザ実動確認は別途行う。

## 状態確認

```powershell
aws cloudformation describe-stacks --stack-name ShogiBattleSite --region us-east-1 --profile shogi-app --query 'Stacks[].{Status:StackStatus,Outputs:Outputs}'
aws route53domains list-operations --region us-east-1 --profile shogi-app
Resolve-DnsName shogi-battle.com
```

既存Sitesへの公開は別経路であり、AWSデプロイでは`.openai/hosting.json`を使用しない。対局データはオリジンごとのlocalStorageに保存されるため、Sitesやlocalhostの対局は新ドメインに自動移行しない。

## 2026-09-09 投げ銭の本番公開

Stripe本番リンク3金額を設定し、`npm run deploy`でShogiBattleSiteのUPDATE_COMPLETEを確認。CloudFront E3VUHI05ICUTJMへ反映済み。`node scripts/verify-deployment.mjs`成功。公開中の設定・案内ページ4ファイルがローカルと一致し、ブラウザで応援モーダルと500円のリンクを確認。単体57件、対象ブラウザ6件成功。実課金は行っていない。
