# Blender編集用ファイル

`aether-assets.blend`が編集用、`dist/assets/*.glb`がWeb配信用です。モデルはこのプロジェクト用のオリジナルです。Web側の地面・岩の材質には、同梱したPoly HavenのCC0テクスチャを使います。地面の混合材質はWeb側で実装しているため、Blenderでは頂点カラーでプレビューされます。

## 編集

1. `aether-assets.blend`をBlender 5.2で開きます。
2. 地形は`Aether_Meadow`シーン、兵士の原型は`Aether_Army`シーンで編集します。
3. `Terrain`の名前を保持してください。丘の形を変えても、Web側はこのメッシュの実際の三角形から高さを取得します。
4. 兵士は`Unit_P/L/N/S/G/B/R/K/A`のルート名と、`_ArmL`、`_ArmR`、`_LegL`、`_LegR`、`_Cape`、`_Promotion`の末尾名を保持してください。Webが部位を特定して動かします。`TeamCloth`材質を陣営色に差し替えます。
5. `LOD_`から始まるルートは遠景用の派生モデルです。原型の`Unit_`を編集してください。再書き出し時に軽量モデルを自動更新します。
6. 編集を保存して、次のコマンドで配信用GLBを書き出します。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/export_assets.py
npm run build
npm run dev
```

`Aether_Meadow`に配置された9体はプレビュー用のサンプルです。エクスポーターは`Unit_`から始まるルート配下とカメラ・ライトを地形GLBから除外します。兵士の正式な原型は`Aether_Army`で編集してください。

## 座標と性能

- 1マスは12m。プレイエリアはX・Yともに−54〜54m、周辺の地面は−240〜240mです。
- BlenderはZが上。glTF出力ではYが上になり、Blenderの−YがWebの+Zに対応します。
- 原点は対局エリア中央。兵士のルート原点は足元、正面はBlenderの+Yです。
- 高低差は演出用です。中央の地形は連続した一枚のメッシュとして保ち、穴や重なる地面、急な崖は周囲へ配置してください。
- 金属・布・装飾はPBR材質と頂点カラーで表現しています。プロシージャル材質を追加するときは、GLBで再現できる材質に変換・ベイクしてください。
- Webでは部位別にメッシュを結合してインスタンス描画します。遠景は軽量モデル、近景は詳細な部位と動きを表示。通常の兵士原型を1.25倍で配置し、スマホでは各部隊を6人で表現します。
- 現在のGLBは約22.69MiB、テクスチャは約6.73MiB。検証上限は素材合計34MiB、500描画呼び出し未満、PC110万三角形未満、スマホ全景60万三角形未満です。

## 原型を再生成する場合

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build_assets.py
```

こちらは初期造形を作り直すコマンドで、`.blend`とGLBを上書きします。手作業で編集した内容を残す場合は使わず、`export_assets.py`を使ってください。通常のWeb開発・テストではBlenderは不要です。

## アニメーション

現在は、Blenderの部位階層をThree.jsから動かす方式です。近景での腕・マント・歩行、隊列の移動と再整列、捕獲時の攻撃・退場、持ち駒投入、成り時の旗・装飾・発光を実装しています。リグやGLBのアニメーションクリップはまだ使っていません。

## 参考

- [Three.js r170 GLTFLoader](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/loaders/GLTFLoader.js)
- [Blender glTF 2.0](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- Three.jsの同梱コードのライセンスは`dist/vendor/THREE-LICENSE.txt`に保存しています。

## 飛車の竜騎士

`Unit_R`はドラゴンと騎手を一体として扱います。`_WingL`、`_WingR`、`_Tail`、`_ForelegL/R`、`_HindlegL/R`の部位名を保持してください。Web側で地上約3.5mを基準に浮かせ、翼と尾を全景でも動かします。中列はさらに1.3m高く配置します。成り用の竜の頭部装甲は`_Promotion`配下です。

原型を作り直す場合は`scripts/dragon.py`と`build_assets.py`を編集します。次の更新スクリプトは飛車とそのサンプルだけを置き換え、他の地形・兵士のメッシュが変化していないことを確認して保存します。手で編集した飛車を残す場合は、通常の`export_assets.py`を使ってください。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/update_rook.py
```


## 桂馬の騎馬隊長と弓兵

`Unit_N`は馬に乗った部隊長、`Unit_A`は弓兵の原型です。Webの桂馬一部隊では`N`を1人、`A`を5人配置します。`A`は描画専用で、将棋の駒種や保存形式には追加しません。陣営色と成りの装飾は両者へ適用されます。

弓兵は`scripts/archer.py`、騎馬隊長は`build_assets.py`で作成します。弓・弦・矢筒・矢の末尾名`_Bow`、`_Bowstring`、`_Quiver`、`_Arrows`を保持してください。遠景モデルでも弓の曲線と細い弦・矢を残すように簡略化します。

次のコマンドは隊長と弓兵、それぞれのLODとプレビューサンプルだけを更新し、他の原型・LOD・地形のメッシュが変わっていないことを確認します。手編集を保存する場合は通常の`export_assets.py`を使います。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/update_knight.py
```
