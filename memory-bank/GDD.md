# ゲームデザインドキュメント (GDD) - Ver 1.2 (エフェクト追加)

## 1. ゲーム概要

* **タイトル:** (仮) `three.js` エンドレスランナー
* **ジャンル:** 3Dエンドレスランナー
* **プラットフォーム:** Webブラウザ (`three.js` を使用)
* **ターゲット:** カジュアルゲーマー、`three.js` 学習者
* **目標:** `three.js` を用いた基本的な3Dゲームの**MVP**を構築し、アイテム機能と基本的なビジュアルエフェクトを追加してその可能性を探る。

## 2. ゲームプレイ

### コアメカニクス / ループ
(Ver 1.1 から変更なし)
1.  プレイヤーキャラクターは、画面奥に向かって一定速度で自動的に前進し続ける。
2.  コース上には障害物やアイテムがランダムまたは一定パターンで出現する。
3.  プレイヤーは左右に移動して障害物を回避し、アイテムを獲得する。
4.  障害物に衝突するとゲームオーバー。
5.  アイテムを獲得すると一時的にプレイヤーの速度が上がる。
6.  走行距離に応じてスコアが増加する。

### プレイヤーキャラクター
(Ver 1.1 から変更なし)
* **表現:** シンプルな幾何学形状（例: 立方体 `THREE.BoxGeometry`）。色は単色。
* **移動:**
    * 前進：自動。基本速度に加え、アイテム効果で一時的に加速する。
    * 左右移動：キーボードの左右矢印キー (`←`, `→`) を使用。押すと、あらかじめ定義された**4つのレーン**のいずれかに瞬時に移動する。

### 障害物
(Ver 1.1 から変更なし)
* **表現:** シンプルな幾何学形状（例: 立方体、壁のような板 `THREE.PlaneGeometry`）。プレイヤーとは異なる単色。
* **出現:** プレイヤーが走行するコース上の**4つのレーン**のいずれかに出現する。
* **生成ロジック:** プレイヤーの前方、カメラに映らない程度の距離に、一定間隔または確率で障害物またはアイテムを生成する。古いオブジェクト（画面外後方）は削除し、新しいオブジェクトを前方に追加し続ける。

### アイテム
(Ver 1.1 から変更なし)
* **種類:** スピードアップアイテム
* **表現:** 障害物とは異なる形状や色（例: 球 `THREE.SphereGeometry`、異なる色）。
* **出現頻度:** 障害物とアイテムの出現機会において、およそ1/3の確率でアイテムが出現する（残りは障害物）。
* **効果:** プレイヤーがアイテムに接触（獲得）すると、一定時間、プレイヤーの前進速度 (`gameSpeed`) が増加する。効果時間は固定（例: 5秒間）。
* **獲得:** プレイヤーがアイテムのバウンディングボックスに接触すると獲得となり、アイテムはシーンから消える。

### 環境 / コース
(Ver 1.1 から変更なし)
* **表現:** 無限に続くように見える直線的な道（例: 長い平面 `THREE.PlaneGeometry`）。道のテクスチャや背景は必須ではない（単色またはシンプルなグリッドでもOK）。

### スコア
(Ver 1.1 から変更なし)
* **計算:** 時間経過または進んだ距離に応じて増加。

### 衝突判定
(Ver 1.1 から変更なし)
* プレイヤーと各**障害物**のバウンディングボックスが交差しているかを毎フレームチェックする。交差が検知されたらゲームオーバーとする。
* プレイヤーと各**アイテム**のバウンディングボックスが交差しているかを毎フレームチェックする。交差が検知されたらアイテム獲得処理を行う。

### ゲームオーバー条件
(Ver 1.1 から変更なし)
* プレイヤーキャラクターが**障害物**に衝突する。

## 3. カメラ
(Ver 1.1 から変更なし)
* **視点:** 三人称視点（`THREE.PerspectiveCamera`）。プレイヤーキャラクターのやや後方、少し上から見下ろすような角度で配置する。
* **追従:** プレイヤーが前進するのに合わせて、カメラも同じ速度で前進する。左右のレーン移動にはカメラは追従しない。

## 4. ユーザーインターフェース (UI)
(Ver 1.1 から変更なし)
* **スコア表示:** 画面の右上隅に、現在のスコアをテキストで表示する (HTML Overlay)。
* **ゲームオーバー表示:** ゲームオーバー状態になった際、「GAME OVER」テキストと最終スコアを表示する (HTML Overlay)。
* **操作指示表示 (任意):**
    * 開始前状態: 「スペースキーで開始」などを表示。
    * ゲームオーバー状態: 「Rキーでリスタート」などを表示。
* **アイテム効果表示 (任意):** スピードアップ効果が発動中であることを示す簡単な表示（例: 画面端にアイコン表示、スコア表示の色変更など）。MVPでは必須ではない。

## 5. ゲームの状態 (Game States)
(Ver 1.1 から変更なし)
* **開始前 (Initial):** ゲームがロードされた初期状態。スペースキー入力を待つ。
* **プレイ中 (Playing):** プレイヤーが走行し、障害物/アイテムが出現、スコアが加算される状態。左右移動、アイテム獲得が可能。
* **ゲームオーバー (Game Over):** 障害物に衝突した状態。動きが停止し、ゲームオーバー表示。
* **リスタート:** ゲームオーバー状態で 'R' キーを押すと初期状態に戻り再開。

## 6. アセット要件 (Asset Requirements)
(Ver 1.1 から変更なし)
* **プレイヤーキャラクター:** 1 x `THREE.Mesh` (例: `THREE.BoxGeometry`, `THREE.MeshBasicMaterial` - 単色)
* **障害物:** 1種類以上の `THREE.Mesh` (例: `THREE.BoxGeometry`, `THREE.MeshBasicMaterial` - プレイヤーと異なる単色)
* **アイテム:** 1 x `THREE.Mesh` (例: `THREE.SphereGeometry`, `THREE.MeshBasicMaterial` - 障害物とも異なる色/形状)
* **コース/地面:** 1 x `THREE.Mesh` (例: `THREE.PlaneGeometry`, `THREE.MeshBasicMaterial` - 単色またはシンプルなグリッド)
* **テクスチャ:** 不要
* **サウンド/BGM:** 不要
* **フォント:** ブラウザ標準 / CSSで指定する基本フォントで可

## 7. ビジュアルエフェクト (Visual Effects) - NEW!

* **トレイルエフェクト (プレイヤー追従):**
    * **種類:** パーティクル放出
    * **見た目:** プレイヤーの後方から、小さな光の粒子が放出され、少しの間漂ってから消える。
    * **実装想定:** `THREE.Points` を使用。プレイヤー位置から定期的にパーティクルを生成し、アニメーションループで位置更新と寿命管理を行う。
* **レーン変更エフェクト (左右移動時):**
    * **種類:** 地面への一時的なマーカー
    * **見た目:** プレイヤーが移動した先のレーンの地面に、一瞬だけ円形または四角形のマーカーが表示されて消える。
    * **実装想定:** レーン変更完了時に、プレイヤー足元に短時間だけ表示される `THREE.Mesh` (例: `CircleGeometry`) を生成・削除する。マテリアルの透明度アニメーションでフェードアウトさせる。
* **アイテム取得エフェクト:**
    * **種類:** 拡大・フェードアウト
    * **見た目:** 獲得したアイテムが一瞬だけ少し拡大し、急速に透明になって消える。
    * **実装想定:** アイテム衝突検知時に、アイテムメッシュの `scale` とマテリアルの `opacity` を短時間アニメーションさせ、完了後にメッシュを削除する。
* **障害物衝突エフェクト (ゲームオーバー時):**
    * **種類:** 画面シェイク + 破片パーティクル
    * **見た目:** 衝突した瞬間に画面が短時間揺れ、同時に衝突した障害物が砕け散るように小さな破片が飛び散る。
    * **実装想定:**
        * **画面シェイク:** 衝突検知後、数フレーム間カメラの位置/角度に微小なランダム値を加える。
        * **破片:** 衝突した障害物を削除し、その位置に複数の小さな `THREE.Mesh` または `THREE.Points` パーティクルを生成し、ランダムな初速と回転を与えて簡易的な物理挙動で動かす。

