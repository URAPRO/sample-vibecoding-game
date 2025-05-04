console.log("Script loaded");

// シーン、カメラ、レンダラーの初期化
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB); // 空色の背景

// カメラの位置と向きを設定
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// ライトの追加
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 10, 5);
scene.add(directionalLight);

// ゲーム設定
const baseSpeed = 0.15; // 基本速度
let currentGameSpeed = baseSpeed; // 現在のゲーム速度
const obstacleDistance = 20; // 障害物を生成する間隔
let nextObstacleZ = -obstacleDistance; // 次の障害物を生成するZ座標
const obstacles = []; // 障害物の配列
const items = []; // アイテムの配列
let score = 0; // スコア
let gameState = 'initial'; // ゲーム状態（'initial', 'playing', 'gameOver'）

// スピードアップアイテム設定
const speedBoostMultiplier = 1.5; // スピードアップの倍率
const boostDuration = 5000; // スピードアップの効果時間（ミリ秒）
let isBoosted = false; // スピードアップ効果が有効かどうか
let boostTimeoutId = null; // スピードアップ効果のタイマーID

// トレイルエフェクト用パーティクルシステム設定
const particleCount = 1000; // 最大パーティクル数
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3); // xyz座標ごとに3つの値
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
    color: 0xFF6347, // トマト色
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
});
const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

// パーティクル管理配列
const trailParticles = [];

// パーティクル生成間隔
const particleEmitInterval = 3; // フレーム間隔
let particleEmitCounter = 0;

// レーンマーカー配列
const laneMarkers = [];

// アイテムエフェクト配列
const itemEffects = [];

// 障害物破片配列
const debrisParticles = [];

// Three.jsのバージョン互換性対応
// r135以降では、テクスチャのneedsUpdateの扱いが変更されています
const isThreeJSVersionGreaterThanR135 = parseInt(THREE.REVISION) >= 135;
if (isThreeJSVersionGreaterThanR135) {
    console.log(`Three.js r${THREE.REVISION} を使用しています。r135以降の互換性対応を適用します。`);
}

// 画面シェイク
let isShaking = false;
let shakeIntensity = 0;
let shakeDuration = 0;
let shakeElapsed = 0;
let originalCameraPosition = new THREE.Vector3();

// UIエレメント
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');

// レーン定義
const lanes = [-3, -1, 1, 3];
let currentLane = 1; // 初期レーンは左から2番目

// 地面（Plane）の作成
const planeGeometry = new THREE.PlaneGeometry(10, 100);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 }); // 森林緑
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // 水平になるように回転
plane.position.z = -45; // プレイヤーの前方に配置
scene.add(plane);

// プレイヤーの作成
const playerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 }); // 赤色
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(lanes[currentLane], 0.4, 0); // 初期位置設定（Y座標は地面の上に浮かせる）
scene.add(player);

// レーンマーカーを作成する関数
function createLaneMarker(x, z) {
    const markerGeometry = new THREE.CircleGeometry(0.7, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF, // シアン色
        transparent: true,
        opacity: 0.7
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.rotation.x = -Math.PI / 2; // 水平に配置
    marker.position.set(x, 0.01, z); // プレイヤーの足元（地面のすぐ上）
    scene.add(marker);
    
    // フェードアウト用のデータを付加
    marker.userData = {
        initialOpacity: 0.7,
        lifetime: 0.8, // 秒
        age: 0
    };
    
    laneMarkers.push(marker);
    return marker;
}

// 障害物を作成する関数
function createObstacle(laneIndex, zPos) {
    const obstacleGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x0000FF }); // 青色
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set(lanes[laneIndex], 0.4, zPos); // Y座標はプレイヤーと同じ
    scene.add(obstacle);
    obstacles.push(obstacle);
    return obstacle;
}

// アイテムを作成する関数
function createItemMesh(laneIndex, zPos) {
    const itemGeometry = new THREE.SphereGeometry(0.5, 16, 16); // 球形のアイテム
    const itemMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); // 黄色
    const item = new THREE.Mesh(itemGeometry, itemMaterial);
    item.position.set(lanes[laneIndex], 0.4, zPos); // Y座標はプレイヤーと同じ
    scene.add(item);
    items.push(item);
    return item;
}

// アイテム獲得処理
function collectItem(item) {
    // 配列からアイテムを削除
    const index = items.indexOf(item);
    if (index !== -1) {
        items.splice(index, 1);
    }
    
    // アイテムをアニメーション対象に追加
    item.material.transparent = true; // 透明度を変更するために必要
    itemEffects.push({
        mesh: item,
        initialScale: item.scale.clone(),
        targetScale: 2.5, // 最終的なサイズ
        initialOpacity: item.material.opacity,
        duration: 0.5, // アニメーション時間（秒）
        age: 0
    });
    
    // スピードアップ効果の開始
    if (boostTimeoutId) {
        clearTimeout(boostTimeoutId); // 既存のタイマーをキャンセル
    }
    
    // 速度アップを適用
    currentGameSpeed = baseSpeed * speedBoostMultiplier;
    isBoosted = true;
    
    // 効果時間後に元の速度に戻す
    boostTimeoutId = setTimeout(() => {
        currentGameSpeed = baseSpeed;
        isBoosted = false;
        boostTimeoutId = null;
    }, boostDuration);
}

// アイテムエフェクト更新関数
function updateItemEffects(deltaTime) {
    for (let i = itemEffects.length - 1; i >= 0; i--) {
        const effect = itemEffects[i];
        effect.age += deltaTime;
        
        // 経過時間の割合（0～1）
        const progress = Math.min(effect.age / effect.duration, 1);
        
        // スケールを徐々に大きくする
        const scale = effect.initialScale.clone().lerp(
            new THREE.Vector3(effect.targetScale, effect.targetScale, effect.targetScale),
            progress
        );
        effect.mesh.scale.copy(scale);
        
        // 不透明度を徐々に下げる
        effect.mesh.material.opacity = effect.initialOpacity * (1 - progress);
        
        // アニメーション完了時にメッシュを削除
        if (progress >= 1) {
            disposeItem(effect.mesh);
            itemEffects.splice(i, 1);
        }
    }
}

// キーボード入力のイベントリスナー
window.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowLeft':
            if (gameState === 'playing' && currentLane > 0) {
                currentLane--;
                player.position.x = lanes[currentLane];
                // レーン変更時にマーカーを表示
                createLaneMarker(lanes[currentLane], player.position.z);
            }
            break;
        case 'ArrowRight':
            if (gameState === 'playing' && currentLane < lanes.length - 1) {
                currentLane++;
                player.position.x = lanes[currentLane];
                // レーン変更時にマーカーを表示
                createLaneMarker(lanes[currentLane], player.position.z);
            }
            break;
        case ' ': // スペースキー
            if (gameState === 'initial') {
                startGame();
            }
            break;
        case 'r':
        case 'R':
            if (gameState === 'gameOver') {
                restartGame();
            }
            break;
    }
});

// ゲーム開始関数
function startGame() {
    gameState = 'playing';
    score = 0;
    updateScore();
    messageElement.style.display = 'none';
}

// ゲームオーバー関数
function gameOver() {
    gameState = 'gameOver';
    messageElement.textContent = `ゲームオーバー！最終スコア: ${score}\nRキーでリスタート`;
    messageElement.style.display = 'block';
}

// ゲームリスタート関数
function restartGame() {
    // スコアリセット
    score = 0;
    updateScore();
    
    // プレイヤー位置リセット
    currentLane = 1;
    player.position.set(lanes[currentLane], 0.4, 0);
    
    // カメラ位置リセット
    camera.position.set(0, 5, 10);
    originalCameraPosition.copy(camera.position);
    
    // 障害物すべて削除
    for (let i = obstacles.length - 1; i >= 0; i--) {
        disposeObstacle(obstacles[i]);
    }
    obstacles.length = 0;
    
    // アイテムすべて削除
    for (let i = items.length - 1; i >= 0; i--) {
        disposeItem(items[i]);
    }
    items.length = 0;
    
    // トレイルパーティクルをクリア
    trailParticles.length = 0;
    particleGeometry.setDrawRange(0, 0);
    
    // レーンマーカーをクリア
    for (let i = laneMarkers.length - 1; i >= 0; i--) {
        disposeMarker(laneMarkers[i]);
    }
    laneMarkers.length = 0;
    
    // アイテムエフェクトをクリア
    for (let i = itemEffects.length - 1; i >= 0; i--) {
        scene.remove(itemEffects[i].mesh);
    }
    itemEffects.length = 0;
    
    // 破片をクリア
    for (let i = debrisParticles.length - 1; i >= 0; i--) {
        disposeDebris(debrisParticles[i]);
    }
    debrisParticles.length = 0;
    
    // シェイク効果をリセット
    isShaking = false;
    
    // スピードアップ効果をリセット
    if (boostTimeoutId) {
        clearTimeout(boostTimeoutId);
        boostTimeoutId = null;
    }
    currentGameSpeed = baseSpeed;
    isBoosted = false;
    
    // 次の障害物生成位置リセット
    nextObstacleZ = -obstacleDistance;
    
    // ゲーム状態を「プレイ中」に変更
    gameState = 'playing';
    messageElement.style.display = 'none';
}

// スコア更新関数
function updateScore() {
    scoreElement.textContent = `スコア: ${score}`;
}

// 衝突判定用のボックスをプリアロケーション
const playerBox = new THREE.Box3();
const obstacleBox = new THREE.Box3();
const itemBox = new THREE.Box3();

// 衝突判定を行う関数
function checkCollision() {
    playerBox.setFromObject(player);
    
    // 障害物との衝突判定
    for (let i = 0; i < obstacles.length; i++) {
        obstacleBox.setFromObject(obstacles[i]);
        if (playerBox.intersectsBox(obstacleBox)) {
            console.log('衝突しました！');
            
            // 破片エフェクト生成
            createDebris(obstacles[i].position.clone(), obstacles[i].material.color);
            
            // シーンから障害物を削除
            disposeObstacle(obstacles[i]);
            
            // 配列から障害物を削除
            obstacles.splice(i, 1);
            
            // 画面シェイク効果開始
            shakeCamera(0.5, 0.2);
            
            // ゲームオーバー処理
            gameOver();
            return true;
        }
    }
    
    // アイテムとの衝突判定
    for (let i = 0; i < items.length; i++) {
        itemBox.setFromObject(items[i]);
        if (playerBox.intersectsBox(itemBox)) {
            console.log('アイテムを獲得しました！');
            collectItem(items[i]);
            return false; // アイテム獲得はゲームオーバーにならない
        }
    }
    
    return false;
}

// パーティクル生成関数
function emitParticle() {
    // プレイヤーの後ろにパーティクルを生成
    const particle = {
        position: new THREE.Vector3(
            player.position.x + (Math.random() * 0.4 - 0.2), // プレイヤーのX座標を中心に少しランダムに
            player.position.y + (Math.random() * 0.4), // プレイヤーのY座標を中心に少し上方向にランダムに
            player.position.z + 0.5 // プレイヤーのZ座標より少し後ろに
        ),
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.03, // X方向にわずかなランダムな速度
            Math.random() * 0.02, // Y方向に上向きのわずかな速度
            0 // Z方向は相対速度をゼロに（プレイヤーとカメラの移動を打ち消す効果）
        ),
        size: Math.random() * 0.1 + 0.05,
        lifetime: 2.0, // 寿命を2秒に延長（以前は1.0秒）
        age: 0 // 現在の年齢（秒）
    };
    
    trailParticles.push(particle);
}

// パーティクル更新関数
function updateParticles(deltaTime) {
    // パーティクルの位置と寿命を更新
    const maxParticles = Math.min(trailParticles.length, 100); // 最大100パーティクルまで処理
    for (let i = trailParticles.length - 1; i >= Math.max(0, trailParticles.length - maxParticles); i--) {
        const particle = trailParticles[i];
        
        // 年齢を更新
        particle.age += deltaTime;
        
        if (particle.age >= particle.lifetime) {
            // 寿命が尽きたらパーティクルを削除
            trailParticles.splice(i, 1);
            continue;
        }
        
        // 位置を更新
        particle.position.add(particle.velocity);
        
        // 不透明度を寿命に基づいて計算（徐々に透明に）
        const opacity = 1 - (particle.age / particle.lifetime);
        
        // 更新したパーティクルの位置を配列に設定
        particlePositions[i * 3] = particle.position.x;
        particlePositions[i * 3 + 1] = particle.position.y;
        particlePositions[i * 3 + 2] = particle.position.z;
    }
    
    // BufferGeometryを更新
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setDrawRange(0, trailParticles.length); // 描画範囲を現在のパーティクル数に設定
    particleGeometry.attributes.position.needsUpdate = true;
}

// マーカー更新関数
function updateMarkers(deltaTime) {
    for (let i = laneMarkers.length - 1; i >= 0; i--) {
        const marker = laneMarkers[i];
        
        // 年齢を更新
        marker.userData.age += deltaTime;
        
        if (marker.userData.age >= marker.userData.lifetime) {
            // 寿命が尽きたらマーカーを削除
            disposeMarker(marker);
            laneMarkers.splice(i, 1);
            continue;
        }
        
        // フェードアウト効果（不透明度を徐々に下げる）
        const opacity = marker.userData.initialOpacity * (1 - marker.userData.age / marker.userData.lifetime);
        marker.material.opacity = opacity;
    }
}

// カメラシェイク開始関数
function shakeCamera(duration, intensity) {
    // 既に揺れている場合は強度を大きい方に更新
    if (isShaking) {
        shakeIntensity = Math.max(shakeIntensity, intensity);
        shakeDuration = Math.max(shakeDuration, duration);
        return;
    }
    
    // シェイク設定
    isShaking = true;
    shakeDuration = duration;
    shakeIntensity = intensity;
    shakeElapsed = 0;
    
    // カメラの元の位置を保存
    originalCameraPosition.copy(camera.position);
}

// 障害物の破片を生成する関数
function createDebris(position, color) {
    const debrisCount = 15; // 破片の数を増加（以前は10）
    
    for (let i = 0; i < debrisCount; i++) {
        // 小さな立方体ジオメトリ（サイズを大きく）
        const size = Math.random() * 0.3 + 0.2; // サイズ範囲を拡大（0.2～0.5）
        const debrisGeometry = new THREE.BoxGeometry(size, size, size);
        const debrisMaterial = new THREE.MeshStandardMaterial({
            color: color || 0x0000FF,
            transparent: true,
            opacity: 0.9,
            emissive: color || 0x0000FF, // 発光効果を追加
            emissiveIntensity: 0.5 // 発光強度
        });
        
        const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
        
        // 元の障害物の位置に破片を配置
        debris.position.copy(position);
        
        // ランダムな方向に初期速度を設定（速度範囲を拡大）
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5, // X方向の速度を増加
            Math.random() * 0.5 + 0.2, // Y方向の速度を増加（より高く）
            (Math.random() - 0.5) * 0.5 // Z方向の速度を増加
        );
        
        // ランダムな回転速度（回転速度を上げる）
        const rotationSpeed = {
            x: (Math.random() - 0.5) * 0.25,
            y: (Math.random() - 0.5) * 0.25,
            z: (Math.random() - 0.5) * 0.25
        };
        
        // データを付加
        debris.userData = {
            velocity: velocity,
            rotationSpeed: rotationSpeed,
            lifetime: 2.0, // 寿命を延長（以前は1.5秒）
            age: 0,
            gravity: 0.03 // 重力を強く（以前は0.01）
        };
        
        // シーンと管理配列に追加
        scene.add(debris);
        debrisParticles.push(debris);
    }
}

// 破片更新関数
function updateDebris(deltaTime) {
    for (let i = debrisParticles.length - 1; i >= 0; i--) {
        const debris = debrisParticles[i];
        
        // 年齢を更新
        debris.userData.age += deltaTime;
        
        if (debris.userData.age >= debris.userData.lifetime) {
            // 寿命が尽きたら破片を削除
            disposeDebris(debris);
            debrisParticles.splice(i, 1);
            continue;
        }
        
        // 位置を更新（速度を加算）
        debris.position.add(debris.userData.velocity);
        
        // 重力の影響（Y方向の速度を減少）
        debris.userData.velocity.y -= debris.userData.gravity;
        
        // 回転を適用
        debris.rotation.x += debris.userData.rotationSpeed.x;
        debris.rotation.y += debris.userData.rotationSpeed.y;
        debris.rotation.z += debris.userData.rotationSpeed.z;
        
        // フェードアウト（徐々に透明に）
        const progress = debris.userData.age / debris.userData.lifetime;
        if (progress > 0.7) { // 寿命の70%を過ぎたら徐々に透明に
            const opacity = 0.9 * (1 - (progress - 0.7) / 0.3);
            debris.material.opacity = opacity;
        }
    }
}

// アニメーションループ
let lastTime = 0;
function animate(time) {
    requestAnimationFrame(animate);
    
    // デルタタイム計算（秒単位）
    let deltaTime = (time - lastTime) / 1000;
    // デルタタイムに制限を設ける（異常に大きな値を防止）
    deltaTime = Math.min(deltaTime, 0.1);
    lastTime = time;
    
    // カメラシェイク更新
    if (isShaking) {
        shakeElapsed += deltaTime;
        
        if (shakeElapsed < shakeDuration) {
            // 残り時間に応じた強度（終わりに近づくほど弱くなる）
            const currentIntensity = shakeIntensity * (1 - shakeElapsed / shakeDuration);
            
            // ランダムなオフセットを計算
            const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
            const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
            
            // カメラ位置にオフセットを適用
            camera.position.x = originalCameraPosition.x + offsetX;
            camera.position.y = originalCameraPosition.y + offsetY;
        } else {
            // シェイク終了、カメラを元の位置に戻す
            camera.position.x = originalCameraPosition.x;
            camera.position.y = originalCameraPosition.y;
            isShaking = false;
        }
    }
    
    if (gameState === 'playing') {
        // プレイヤーの自動前進（現在のゲーム速度を使用）
        player.position.z -= currentGameSpeed;
        
        // カメラの追従（現在のゲーム速度を使用）
        camera.position.z -= currentGameSpeed;
        if (!isShaking) {
            // シェイク中でなければ元のカメラ位置も更新
            originalCameraPosition.z = camera.position.z;
        }
        
        // 地面の位置を更新（カメラと一緒に移動させる）
        plane.position.z = camera.position.z - 45;
        
        // トレイルパーティクル生成
        particleEmitCounter++;
        if (particleEmitCounter >= particleEmitInterval) {
            emitParticle();
            particleEmitCounter = 0;
        }
        
        // パーティクル更新
        updateParticles(deltaTime);
        
        // マーカー更新
        updateMarkers(deltaTime);
        
        // アイテムエフェクト更新
        updateItemEffects(deltaTime);
        
        // 破片更新
        updateDebris(deltaTime);
        
        // 障害物/アイテム生成ロジック
        if (player.position.z <= nextObstacleZ) {
            // ランダムなレーンを選択
            const randomLane = Math.floor(Math.random() * lanes.length);
            
            // 1/3の確率でアイテム、2/3の確率で障害物を生成
            if (Math.random() < 0.33) {
                createItemMesh(randomLane, player.position.z - 50); // アイテム生成
            } else {
                createObstacle(randomLane, player.position.z - 50); // 障害物生成
            }
            
            // 次のオブジェクトの位置を設定
            nextObstacleZ = player.position.z - obstacleDistance;
        }
        
        // 画面外の障害物を削除
        for (let i = obstacles.length - 1; i >= 0; i--) {
            if (obstacles[i].position.z > camera.position.z + 5) {
                disposeObstacle(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }
        
        // 画面外のアイテムを削除
        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].position.z > camera.position.z + 5) {
                disposeItem(items[i]);
                items.splice(i, 1);
            }
        }
        
        // スコア加算
        score += 1;
        if (score % 10 === 0) { // パフォーマンスのため、10点ごとに更新
            updateScore();
        }
        
        // 衝突判定
        checkCollision();
    }
    
    renderer.render(scene, camera);
}
animate();

// ウィンドウリサイズ対応
let resizeTimeout;
window.addEventListener('resize', () => {
    // リサイズ中の複数呼び出しを防止
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100); // 100ms後に実行
});

// 障害物を削除する補助関数（メモリリーク防止）
function disposeObstacle(obstacle) {
    scene.remove(obstacle);
    if (obstacle.geometry) obstacle.geometry.dispose();
    if (obstacle.material) {
        if (Array.isArray(obstacle.material)) {
            obstacle.material.forEach(material => material.dispose());
        } else {
            obstacle.material.dispose();
        }
    }
}

// アイテムを削除する補助関数（メモリリーク防止）
function disposeItem(item) {
    scene.remove(item);
    if (item.geometry) item.geometry.dispose();
    if (item.material) {
        if (Array.isArray(item.material)) {
            item.material.forEach(material => material.dispose());
        } else {
            item.material.dispose();
        }
    }
}

// マーカーを削除する補助関数（メモリリーク防止）
function disposeMarker(marker) {
    scene.remove(marker);
    if (marker.geometry) marker.geometry.dispose();
    if (marker.material) marker.material.dispose();
}

// 破片を削除する補助関数（メモリリーク防止）
function disposeDebris(debris) {
    scene.remove(debris);
    if (debris.geometry) debris.geometry.dispose();
    if (debris.material) debris.material.dispose();
} 