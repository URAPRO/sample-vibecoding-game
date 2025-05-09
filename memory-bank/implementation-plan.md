# 実装プラン - ビジュアルエフェクト追加 - Ver 1.0

このプランは、アイテム機能まで実装済みのエンドレスランナーゲームに対し、GDD Ver 1.2 で定義されたビジュアルエフェクトを追加実装するための手順を示します。

## 前提条件

* エンドレスランナーのアイテム機能追加版（GDD Ver 1.1 相当）が実装済みであること。
* `three.js` のシーン、カメラ、レンダラー、アニメーションループが整備されていること。
* プレイヤー、障害物、アイテムのオブジェクトと基本的なゲームロジック（移動、生成、削除、衝突判定、状態管理）が動作していること。

## フェーズ 1: トレイルエフェクト (パーティクル放出)

1.  **1-1. パーティクル用ジオメトリとマテリアルの準備:**
    * `THREE.BufferGeometry` を作成します。最初は空で良いですが、後で頂点（パーティクル）の位置情報を格納します。
    * `THREE.PointsMaterial` を作成し、パーティクルの色、サイズ (`size`)、透過 (`transparent: true`, `opacity`) などを設定します。`sizeAttenuation: true` にすると遠くのパーティクルが小さく見えます。
    * `THREE.Points` オブジェクトをジオメトリとマテリアルから作成し、シーンに追加します。
    * **テスト:** シーンに `THREE.Points` オブジェクトが追加されていることを確認します（まだパーティクルは見えません）。

2.  **1-2. パーティクル管理配列と生成ロジック:**
    * 個々のパーティクルの情報（位置、速度、寿命など）を管理するための配列 `trailParticles = []` を用意します。
    * `animate` 関数内の `gameState === 'playing'` ブロックで、一定間隔（例: 数フレームごと）またはプレイヤーが一定距離進むごとに、新しいパーティクル情報を `trailParticles` 配列に追加する処理を実装します。
        * パーティクルの初期位置はプレイヤーの現在位置 (`player.position`) に設定します。
        * 初期速度はプレイヤーの進行方向と逆向きに少し与えます。
        * 寿命（例: 1秒）を設定します。
    * **テスト:** ゲームプレイ中に `trailParticles` 配列にデータが追加されていくことを確認します（デバッガなど）。

3.  **1-3. パーティクル更新と描画:**
    * `animate` 関数内で `trailParticles` 配列をループします。
    * 各パーティクルの寿命を減らし、位置を速度に基づいて更新します。
    * 寿命が尽きたパーティクルを配列から削除します。
    * 生きているパーティクルの位置情報を `THREE.BufferGeometry` の `position` 属性に設定します (`geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3));`)。頂点数が変わる場合は `drawRange` を更新するか、属性を再設定します。
    * `geometry.attributes.position.needsUpdate = true;` を設定してジオメトリの更新を `three.js` に伝えます。
    * **テスト:** ゲームプレイ中にプレイヤーの後ろからパーティクルが放出され、動き、消えていくトレイルエフェクトが表示されることを確認します。パーティクルの数や見た目を調整します。

## フェーズ 2: レーン変更エフェクト (地面マーカー)

4.  **2-1. マーカー用メッシュ生成関数の作成:**
    * レーン変更時に表示するマーカー用の `THREE.Mesh` (例: `THREE.CircleGeometry` または `PlaneGeometry` に半透明のマテリアル) を作成する関数 `createLaneMarkerMesh()` を実装します。マテリアルは `transparent: true` に設定します。
    * **テスト:** 関数を呼び出し、意図したマーカーメッシュが生成されることを確認します。

5.  **2-2. レーン変更時のマーカー表示ロジック:**
    * プレイヤーのレーン変更処理が完了する箇所（キー入力イベントハンドラ内など）で以下を実行します。
        * `createLaneMarkerMesh()` を呼び出してマーカーメッシュを作成します。
        * マーカーの位置をプレイヤーの足元（変更後のレーン位置、Y座標は地面の高さ）に設定します (`marker.position.set(player.position.x, 0, player.position.z);`)。
        * マーカーをシーンに追加します。
        * **テスト:** 左右にレーン変更すると、移動先の地面にマーカーが一瞬表示されることを確認します（まだ消えません）。

6.  **2-3. マーカーのフェードアウトと削除:**
    * マーカーをシーンに追加する際に、そのマーカーオブジェクトに消滅タイマー（例: `setTimeout`）を設定するか、アニメーションループで管理するアクティブなマーカーリストに追加します。
    * タイマーまたはアニメーションループ内で、マーカーのマテリアルの `opacity` を徐々に 0 に変化させます。
    * 透明度が 0 になったら、または一定時間経過したら、マーカーメッシュをシーンから削除 (`scene.remove(marker)`) します。
    * **テスト:** レーン変更時に表示されたマーカーが、短時間でスムーズに消えることを確認します。

## フェーズ 3: アイテム取得エフェクト (拡大・フェードアウト)

7.  **3-1. アイテム獲得処理の変更:**
    * 既存のアイテム獲得処理関数 `collectItem(item)` 内、またはアイテムとの衝突判定が成功した直後にエフェクト処理を追加します。
    * アイテムを即座に `scene.remove()` するのではなく、エフェクト用のアニメーションを開始するように変更します。
    * エフェクト対象のアイテムを管理するリスト `itemEffects = []` などを用意し、獲得したアイテムとアニメーションの進捗（経過時間など）を記録します。
    * **テスト:** アイテムを獲得してもすぐには消えず、`itemEffects` リストに追加されることを確認します。

8.  **3-2. 拡大・フェードアウトアニメーション:**
    * `animate` 関数内で `itemEffects` リストをループします。
    * 各アイテムに対して、経過時間に基づいて `scale` を目標値まで増加させ、同時にマテリアルの `opacity` を 0 に向かって減少させます (`item.material.opacity = ...; item.scale.set(...)`)。マテリアルに `transparent: true` が設定されていることを確認します。
    * アニメーションが完了（例: 一定時間経過または `opacity` が 0 になった）したら、そのアイテムを `scene.remove()` でシーンから削除し、`itemEffects` リストからも削除します。
    * **テスト:** アイテムを獲得すると、アイテムが一瞬大きくなりながら消えていくアニメーションが表示されることを確認します。

## フェーズ 4: 障害物衝突エフェクト (画面シェイク + 破片)

9.  **4-1. 画面シェイク関数の実装:**
    * カメラを揺らす関数 `shakeCamera(duration, intensity)` を実装します。
    * この関数は、指定された `duration` (ミリ秒) の間、`intensity` に基づいてカメラの位置や角度に微小なランダムオフセットを加える処理をアニメーションループに一時的に組み込みます。
    * `setTimeout` などで、`duration` 後にオフセットを加える処理を停止し、カメラを元の状態に戻すようにします。
    * **テスト:** この関数を直接呼び出し、指定した時間と強さで画面が揺れることを確認します。

10. **4-2. 破片パーティクル生成関数の実装:**
    * 衝突した障害物の位置に、複数の小さな破片メッシュ (`THREE.Mesh` - 小さな `BoxGeometry` など) またはパーティクル (`THREE.Points`) を生成する関数 `createDebris(position)` を実装します。
    * 各破片にランダムな方向への初期速度と回転速度を与えます。
    * 生成した破片オブジェクトを管理するリスト `debrisParticles = []` に追加し、シーンに追加します。
    * **テスト:** この関数を呼び出し、指定した位置から破片が飛び散るように見えることを確認します。

11. **4-3. 破片の更新と削除:**
    * `animate` 関数内で `debrisParticles` リストをループします。
    * 各破片の位置を速度に基づいて更新し、回転も適用します。簡易的な重力（Y方向の速度を減衰させる）を加えても良いでしょう。
    * 一定時間経過、または画面外に出た破片をシーンから削除し、リストからも削除します。
    * **テスト:** 生成された破片が放物線を描くように動き、やがて消えることを確認します。

12. **4-4. 障害物衝突処理への組み込み:**
    * 既存の障害物衝突判定が成功した箇所（ゲームオーバー処理の直前など）で以下を実行します。
        * `shakeCamera()` 関数を呼び出して画面を揺らします。
        * 衝突した障害物オブジェクトを `scene.remove()` します。
        * `createDebris()` 関数を呼び出して、衝突した障害物の位置に破片を生成します。
    * **テスト:** 障害物に衝突すると、画面が揺れ、障害物が消えて破片が飛び散るエフェクトが発生し、その後ゲームオーバー状態になることを確認します。

## フェーズ 5: 調整と統合テスト

13. **5-1. エフェクトのパラメータ調整:**
    * 各エフェクトの見た目（パーティクルの数、色、サイズ、速度、寿命、マーカーの形状、アニメーション速度など）やタイミングを調整し、全体のバランスを見ます。
    * パフォーマンスへの影響も考慮し、パーティクル数などを調整します。
    * **テスト:** 実際にプレイし、各エフェクトが意図通りに表示され、ゲームの雰囲気を壊さず、かつパフォーマンスに大きな問題がないことを確認します。

14. **5-2. 総合テスト:**
    * すべてのエフェクトが、対応するゲーム内のイベント（レーン変更、アイテム取得、障害物衝突）で正しくトリガーされ、表示されることを確認します。
    * エフェクトが他のゲームロジック（スコア計算、状態遷移など）に悪影響を与えていないことを確認します。
    * リスタート時にエフェクト関連の状態（パーティクルリストなど）が正しくリセットされることを確認します。

---

このプランに沿って、各エフェクトを段階的に実装・テストしていくことで、ゲームに視覚的な魅力を追加できるはずです。
