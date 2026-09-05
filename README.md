# AETHER SHOGI — 蒼穹の盤上

Workで作成した、兵士と城塞を舞台にした3D将棋デモ。同一端末で2人対局できます。

## ローカル起動

Node.js 22以降で実行します。依存パッケージのインストールは不要です。

```sh
npm run dev
```

http://127.0.0.1:5173 を開いてください。終了は Ctrl+C。

```sh
npm test
```

## 構成

- `dist/index.html`：画面・設計説明
- `dist/app.js`：Three.jsによる3D描画、操作、対局状態、自動保存
- `dist/rules.mjs`：描画から独立した将棋ルール
- `dist/style.css`：画面スタイル
- `dist/three.module.js`：同梱Three.js r170（MIT）
- `tests/rules.test.mjs`：ルールテスト
- `.openai/hosting.json`：既存Sitesへの紐付け

`dist/` は元デモの編集対象ソース兼配信ファイルです。生成物として削除・除外しないでください。ビルド工程はありません。フォントはGoogle Fontsから取得します。対局はブラウザのlocalStorageに保存されるため、公開デモの対局状態はlocalhostには引き継がれません。

移動・捕獲・成り・持ち駒・王手・二歩・打ち歩詰め・千日手判定、視点操作、一手戻すに対応。CPU・オンライン対局・対局時計・持将棋・入玉宣言は未実装です。

## 取り込み元

- デモ：https://aether-shogi.seiyaito.chatgpt.site
- Workタスク：将棋ゲーム設計
- Sites保存バージョン：1
- 元ソースコミット：`d73727857816ceba91d9da95ca0e307f547f4573`

2026-09-05にSitesの元Git履歴を本リポジトリへマージしました。今後の開発はこのリポジトリで管理します。GitHubへのpushだけではSitesは更新されません。
