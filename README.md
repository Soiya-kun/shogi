# AETHER SHOGI — 蒼穹の盤上

Blenderで制作した草原・丘と8兵種を使う3D将棋。同一端末で2人対局できます。Work製デモを基に、108m四方の丘陵に40部隊・392人を配置します。地形に沿う9×9のマス、実写の地面材質、隊列移動、全景・部隊への接近表示に対応します。

今後の構想・Blender連携の状況は[将棋アプリの構想と制作方針](docs/product-vision.md)を参照してください。

先手・後手それぞれの「AI開始」で、現在の局面からAIに任せられます。両軍AIの観戦、途中停止での手動復帰、戦法・作戦の変更に対応します。AIと移動演出は並行して動きます。

飛車は8騎の騎馬武者隊です。成ると翼のない東洋の龍へ乗り替わり、空中を移動します。捕獲して持ち駒から打つと馬の部隊へ戻ります。

## ローカル起動

Node.js 22以降で実行します。依存パッケージのインストールは不要です。

```sh
npm run dev
```

http://127.0.0.1:5173 を開いてください。終了は Ctrl+C。

検証用の依存パッケージを入れてから実行します。ブラウザテストにはGoogle Chromeを使用します。

```sh
npm ci
npm test
npm run build
npm run test:web
```

`npm run build`は配信アセットの構造・座標・容量を検証します。Webのソースを変換する工程はありません。

- [Blenderファイルの編集・再書き出し](assets/blender/README.md)
- [部隊化・広域フィールドの仕様](docs/squad-scale.md)
- [実装・検証結果](docs/implementation-report.md)
- [AIの操作・採用版・配信設定](docs/ai-implementation.md)

## 構成

- `dist/index.html`：画面・設計説明
- `dist/app.js`：画面操作・自動保存
- `dist/match.mjs`：対局状態・履歴・終局判定
- `dist/game-controller.mjs`、`dist/ai/`：先後のAI担当・指示、USI、局面別定跡、Worker＋WASM探索
- `dist/battlefield.js`：GLB読込、3D描画、操作、アニメーション
- `dist/formations.mjs`、`dist/squad-renderer.js`：部隊構成・インスタンス描画・詳細度切替
- `dist/terrain-material.js`：草・土・岩の材質
- `dist/terrain.mjs`：マス座標とGLB地面の高さ
- `assets/blender/`：編集用Blenderファイル
- `dist/assets/`：Web配信用GLB・CC0テクスチャ
- `dist/rules.mjs`：描画から独立した将棋ルール
- `dist/style.css`：画面スタイル
- `dist/three.module.js`：同梱Three.js r170（MIT）
- `tests/`：ルール・対局・地形・ブラウザテスト
- `.openai/hosting.json`：既存Sitesへの紐付け

`dist/` は元デモの編集対象ソース兼配信ファイルです。生成物として削除・除外しないでください。ビルド工程はありません。フォントはGoogle Fontsから取得します。対局はブラウザのlocalStorageに保存されるため、公開デモの対局状態はlocalhostには引き継がれません。

移動・捕獲・成り・持ち駒・王手・二歩・打ち歩詰め・千日手判定、視点操作、一手戻す、先後それぞれのAIに対応。オンライン対局・対局時計・持将棋・入玉宣言は未実装です。

AIにはlocalhostまたはHTTPSとクロスオリジン分離が必要です。ローカルサーバーは必要ヘッダーを設定します。静的ホストでは`dist/_headers`を適用するか、初回AI起動時のService Workerによる準備を使用します。やねうら王WASMのGPLv3本文・対応ソース・固定版の情報は`dist/ai/vendor/`と画面の「AIについて」から確認できます。

## 取り込み元

- デモ：https://aether-shogi.seiyaito.chatgpt.site
- Workタスク：将棋ゲーム設計
- Sites保存バージョン：1
- 元ソースコミット：`d73727857816ceba91d9da95ca0e307f547f4573`

2026-09-05にSitesの元Git履歴を本リポジトリへマージしました。今後の開発はこのリポジトリで管理します。GitHubへのpushだけではSitesは更新されません。
