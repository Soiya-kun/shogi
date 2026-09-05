# Blender編集用ファイル

`aether-assets.blend`が編集用、`dist/assets/*.glb`がWeb配信用です。モデルはこのプロジェクト用に制作したオリジナルで、外部素材・テクスチャは使用していません。

## 編集

1. `aether-assets.blend`をBlender 5.2で開きます。
2. 地形は`Aether_Meadow`シーン、兵士の原型は`Aether_Army`シーンで編集します。
3. `Terrain`の名前を保持してください。丘の形を変えても、Web側はこのメッシュの実際の三角形から高さを取得します。
4. 兵士は`Unit_P/L/N/S/G/B/R/K`のルート名と、`_ArmL`、`_ArmR`、`_LegL`、`_LegR`、`_Cape`、`_Promotion`の末尾名を保持してください。Webが部位を特定して動かします。`TeamCloth`材質を陣営色に差し替えます。
5. 編集を保存して、次のコマンドで配信用GLBを書き出します。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/export_assets.py
npm run build
npm run dev
```

`Aether_Meadow`に配置された8体はプレビュー用のサンプルです。エクスポーターは`Unit_`から始まるルート配下とカメラ・ライトを地形GLBから除外します。兵士の正式な原型は`Aether_Army`で編集してください。

## 座標と性能

- 1マスは1.6m。プレイエリアはX・Yともに−7.2〜7.2mです。
- BlenderはZが上。glTF出力ではYが上になり、Blenderの−YがWebの+Zに対応します。
- 原点は対局エリア中央。兵士のルート原点は足元、正面はBlenderの+Yです。
- 高低差は演出用です。中央の地形は連続した一枚のメッシュとして保ち、穴や重なる地面、急な崖は周囲へ配置してください。
- 金属・布・装飾はPBR材質と頂点カラーで表現しています。プロシージャル材質を追加するときは、GLBで再現できる材質に変換・ベイクしてください。
- Webではモデルのジオメトリと材質を共有し、影は配置変更・移動中のみ再計算します。
- 目標はGLB合計10MiB未満、40体表示時25万三角形・500描画呼び出し未満。現在のアセットは約7.04MiBです。

## 原型を再生成する場合

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build_assets.py
```

こちらは初期造形を作り直すコマンドで、`.blend`とGLBを上書きします。手作業で編集した内容を残す場合は使わず、`export_assets.py`を使ってください。通常のWeb開発・テストではBlenderは不要です。

## アニメーション

現在は、Blenderの部位階層をThree.jsから動かす方式です。待機時の腕・マント、移動時の手足、捕獲時の攻撃・退場、持ち駒投入、成り時の装飾・発光を実装しています。リグやGLBのアニメーションクリップはまだ使っていません。

## 参考

- [Three.js r170 GLTFLoader](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/loaders/GLTFLoader.js)
- [Blender glTF 2.0](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- Three.jsの同梱コードのライセンスは`dist/vendor/THREE-LICENSE.txt`に保存しています。
