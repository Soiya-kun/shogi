# Blender編集用ファイル

`aether-assets.blend`が編集用、`dist/assets/*.glb`がWeb配信用です。モデルはこのプロジェクト用のオリジナルです。Web側の地面・岩の材質には、同梱したPoly HavenのCC0テクスチャを使います。地面の混合材質はWeb側で実装しているため、Blenderでは頂点カラーでプレビューされます。

## 編集

1. `aether-assets.blend`をBlender 5.2で開きます。
2. 地形は`Aether_Meadow`シーン、兵士の原型は`Aether_Army`シーンで編集します。
3. `Terrain`の名前を保持してください。丘の形を変えても、Web側はこのメッシュの実際の三角形から高さを取得します。
4. 兵士は`Unit_P/L/N/S/G/B/R/K/A/H/D`のルート名と、`_ArmL`、`_ArmR`、`_LegL`、`_LegR`、`_Cape`、`_Promotion`の末尾名を保持してください。`D`は成り飛車の龍専用です。Webが部位を特定して動かします。`TeamCloth`材質を陣営色に差し替えます。
5. `LOD_`から始まるルートは遠景用の派生モデルです。原型の`Unit_`を編集してください。再書き出し時に軽量モデルを自動更新します。
6. 編集を保存して、次のコマンドで配信用GLBを書き出します。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/export_assets.py
npm run build
npm run dev
```

`Aether_Meadow`に配置された11体はプレビュー用のサンプルです。エクスポーターは`Unit_`から始まるルート配下とカメラ・ライトを地形GLBから除外します。兵士の正式な原型は`Aether_Army`で編集してください。

## 座標と性能

- 1マスは12m。プレイエリアはX・Yともに−54〜54m、周辺の地面は−240〜240mです。
- BlenderはZが上。glTF出力ではYが上になり、Blenderの−YがWebの+Zに対応します。
- 原点は対局エリア中央。兵士のルート原点は足元、正面はBlenderの+Yです。
- 高低差は演出用です。中央の地形は連続した一枚のメッシュとして保ち、穴や重なる地面、急な崖は周囲へ配置してください。
- 金属・布・装飾はPBR材質と頂点カラーで表現しています。プロシージャル材質を追加するときは、GLBで再現できる材質に変換・ベイクしてください。
- Webでは部位別にメッシュを結合してインスタンス描画します。遠景は軽量モデル、近景は詳細な部位と動きを表示。通常の兵士原型を1.25倍で配置し、スマホでは各部隊を6人で表現します。
- 現在のGLBは約24.18MiB、テクスチャは約6.73MiB。検証上限は素材合計34MiB、500描画呼び出し未満、PC110万三角形未満、スマホ全景60万三角形未満です。

## 原型を再生成する場合

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/build_assets.py
```

こちらは初期造形を作り直すコマンドで、`.blend`とGLBを上書きします。手作業で編集した内容を残す場合は使わず、`export_assets.py`を使ってください。通常のWeb開発・テストではBlenderは不要です。

## アニメーション

現在は、Blenderの部位階層をThree.jsから動かす方式です。近景での腕・マント・歩行、隊列の移動と再整列、捕獲時の攻撃・退場、持ち駒投入、成り時の旗・装飾・発光を実装しています。リグやGLBのアニメーションクリップはまだ使っていません。

全兵種の戦闘は`dist/combat-motion.mjs`で姿勢と時間、`dist/combat-effects.js`で矢・札・炎・土煙を定義します。戦闘中は遠景のLODでも腕等の部位を分けて動かすため、LODの部位階層も保持してください。敵の転倒は兵士全体の変換で表現します。[戦闘演出の実装記録](../../docs/combat-implementation.md)。

## 参考

- [Three.js r170 GLTFLoader](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/loaders/GLTFLoader.js)
- [Blender glTF 2.0](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
- Three.jsの同梱コードのライセンスは`dist/vendor/THREE-LICENSE.txt`に保存しています。

## 飛車の騎馬武者と成り後の龍

通常の飛車は`Unit_R`の馬と騎馬武者、成った飛車は`Unit_D`の東洋の龍と武者を使います。`D`は表示専用で、将棋の駒種は`R`のままです。両方とも8騎（スマホでは6騎）の配置を維持します。馬は地上、成り後の龍だけを地上約3.5mで浮遊させ、中列はさらに1.3m高くします。捕獲して打ち直すと通常の馬へ戻ります。

馬は`scripts/warhorse.py`、龍は`eastern_dragon.py`、騎手は`samurai.py`で作成します。龍は翼のない長い胴、腹板、鱗、枝角、ひげ、たてがみ、四肢と爪を備えます。`_Tail`、`_ForelegL/R`、`_HindlegL/R`の部位名と、龍の`_Antlers`、`_WhiskersMane`を保持してください。角とひげは遠景でも形を残します。次の更新スクリプトは飛車の2原型・LOD・サンプルだけを置き換え、他の地形・兵士とLODのメッシュ、地形GLBが変化していないことを確認して保存します。手編集を残す場合は通常の`export_assets.py`を使ってください。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/update_rook.py
```


## 桂馬の騎馬隊長と弓兵

`Unit_N`は馬に乗った部隊長、`Unit_A`は弓兵の原型です。Webの桂馬一部隊では`N`を1人、`A`を5人配置します。`A`は描画専用で、将棋の駒種や保存形式には追加しません。陣営色と成りの装飾は両者へ適用されます。

全兵士は`scripts/samurai.py`で作成します。`archer.py`は弓足軽を呼び出す互換入口です。隊長は兜と陣羽織、弓足軽は陣笠と非対称の和弓を備えます。弓・弦・矢筒・矢の末尾名`_Bow`、`_Bowstring`、`_Quiver`、`_Arrows`を保持してください。遠景モデルでも弓の曲線と細い弦・矢を残すように簡略化します。

次のコマンドは隊長と弓兵、それぞれのLODとプレビューサンプルだけを更新し、他の原型・LOD・地形のメッシュが変わっていないことを確認します。手編集を保存する場合は通常の`export_assets.py`を使います。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/update_knight.py
```


## 銀の重装武者

銀の部隊は描画専用原型`Unit_H`を8人使います。`Unit_S`は角の護衛用の侍として保持しています。将棋の銀の駒種は`S`のままで、Webの`formations.mjs`が重装武者原型へ対応付けます。

原型は`scripts/samurai.py`で大鎧・兜・面頬・大袖・太刀を作成します。`heavy_knight.py`は互換入口です。`_Do`、`_Kabuto`、`_Maedate`、`_Menpo`、`_SodeL/R`、`_Tachi`と既存の部位ピボット名を保持してください。遠景でも大きな装甲と太刀の輪郭を残します。

次のスクリプトは重装武者とそのLOD・サンプルだけを更新し、他のモデルと地形を保持します。手編集を保存する場合は`export_assets.py`を使ってください。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/update_silver.py
```

## 全兵士を和風原型から更新

`scripts/samurai.py`に陣笠、兜、胴、草摺、大袖、威糸、太刀、和弓、指物、軍配、狩衣をまとめています。原型は`style=sengoku_fantasy`のメタデータを持ち、Webの陣営色は布・威糸・指物に適用します。小さな紋は平面、甲冑の重なる部分は不要な裏面を省き、描画負荷を抑えています。

次のコマンドは全原型・LOD・サンプルを和風モデルで置換します。地形のメッシュハッシュと既存の地形GLBが不変であることを確認して保存します。手編集した兵士を保持する場合は通常の`export_assets.py`を使ってください。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/blender/aether-assets.blend --python scripts/update_samurai.py
```
