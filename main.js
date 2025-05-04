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
    // シーンと配列からアイテムを削除
    scene.remove(item);
    const index = items.indexOf(item);
    if (index !== -1) {
        items.splice(index, 1);
    }
    
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

// キーボード入力のイベントリスナー
window.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowLeft':
            if (gameState === 'playing' && currentLane > 0) {
                currentLane--;
                player.position.x = lanes[currentLane];
            }
            break;
        case 'ArrowRight':
            if (gameState === 'playing' && currentLane < lanes.length - 1) {
                currentLane++;
                player.position.x = lanes[currentLane];
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
    
    // 障害物すべて削除
    for (let i = obstacles.length - 1; i >= 0; i--) {
        scene.remove(obstacles[i]);
    }
    obstacles.length = 0;
    
    // アイテムすべて削除
    for (let i = items.length - 1; i >= 0; i--) {
        scene.remove(items[i]);
    }
    items.length = 0;
    
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

// 衝突判定を行う関数
function checkCollision() {
    const playerBox = new THREE.Box3().setFromObject(player);
    
    // 障害物との衝突判定
    for (let i = 0; i < obstacles.length; i++) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacles[i]);
        if (playerBox.intersectsBox(obstacleBox)) {
            console.log('衝突しました！');
            gameOver();
            return true;
        }
    }
    
    // アイテムとの衝突判定
    for (let i = 0; i < items.length; i++) {
        const itemBox = new THREE.Box3().setFromObject(items[i]);
        if (playerBox.intersectsBox(itemBox)) {
            console.log('アイテムを獲得しました！');
            collectItem(items[i]);
            return false; // アイテム獲得はゲームオーバーにならない
        }
    }
    
    return false;
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    
    if (gameState === 'playing') {
        // プレイヤーの自動前進（現在のゲーム速度を使用）
        player.position.z -= currentGameSpeed;
        
        // カメラの追従（現在のゲーム速度を使用）
        camera.position.z -= currentGameSpeed;
        
        // 地面の位置を更新（カメラと一緒に移動させる）
        plane.position.z = camera.position.z - 45;
        
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
                scene.remove(obstacles[i]);
                obstacles.splice(i, 1);
            }
        }
        
        // 画面外のアイテムを削除
        for (let i = items.length - 1; i >= 0; i--) {
            if (items[i].position.z > camera.position.z + 5) {
                scene.remove(items[i]);
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
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}); 