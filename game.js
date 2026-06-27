const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 画面サイズ合わせ
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ゲームデータ
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    speed: 4,
    atk: 10,
    weapon: 'ボロい剣',
    angle: 0
};

// 完全な純粋素材インベントリ（ガチャ・現物ドロップなし）
const inventory = {
    copper: 0,
    iron: 0,
    bone: 0
};

let kills = 0;
const enemies = [];
const keys = {};
const mouse = { x: 0, y: 0 };

// キー入力監視
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

// 手動攻撃（左クリック）
canvas.addEventListener('mousedown', () => {
    performAttack();
});

// 敵の生成
function spawnEnemy() {
    if (enemies.length < 5) {
        const types = ['slime', 'skeleton'];
        const type = types[Math.floor(Math.random() * types.length)];
        enemies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            type: type,
            hp: type === 'slime' ? 20 : 45,
            size: 18,
            color: type === 'slime' ? '#2ecc71' : '#95a5a6'
        });
    }
}
setInterval(spawnEnemy, 2000);

// 手動攻撃の処理
function performAttack() {
    const attackDist = 60;
    const atkX = player.x + Math.cos(player.angle) * attackDist;
    const atkY = player.y + Math.sin(player.angle) * attackDist;

    // 攻撃エフェクト（白波紋）
    ctx.beginPath();
    ctx.arc(atkX, atkY, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // 敵との当たり判定
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = Math.hypot(e.x - atkX, e.y - atkY);
        if (dist < e.size + 30) {
            e.hp -= player.atk;
            
            // 敵死亡時の素材ドロップ処理
            if (e.hp <= 0) {
                dropMaterial(e.type);
                enemies.splice(i, 1);
                kills++;
                document.getElementById('kill-count').innerText = kills;
            }
        }
    }
}

// 素材ドロップ（武器は絶対落とさない）
function dropMaterial(enemyType) {
    if (enemyType === 'slime') {
        inventory.copper += 1;
    } else if (enemyType === 'skeleton') {
        if (Math.random() > 0.5) {
            inventory.iron += 1;
        } else {
            inventory.bone += 1;
        }
    }
    updateUI();
}

// 鍛冶屋での武器作成
function craftWeapon(type) {
    if (type === 'bronze' && inventory.copper >= 3) {
        inventory.copper -= 3;
        player.weapon = 'ブロンズソード';
        player.atk = 25;
    } else if (type === 'iron' && inventory.iron >= 5 && inventory.bone >= 2) {
        inventory.iron -= 5;
        inventory.bone -= 2;
        player.weapon = 'アイアンエッジ';
        player.atk = 45;
    }
    updateUI();
}

// UI表示の更新
function updateUI() {
    document.getElementById('mat-copper').innerText = inventory.copper;
    document.getElementById('mat-iron').innerText = inventory.iron;
    document.getElementById('mat-bone').innerText = inventory.bone;
    document.getElementById('current-weapon').innerText = player.weapon;
    document.getElementById('player-atk').innerText = player.atk;

    // ボタンの有効化チェック
    document.getElementById('btn-craft-1').disabled = inventory.copper < 3;
    document.getElementById('btn-craft-2').disabled = (inventory.iron < 5 || inventory.bone < 2);
}

// メインループ
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // グリッド背景の描画
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    for (let i = -canvas.width; i < canvas.width * 2; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - canvas.height, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvas.height, canvas.height);
        ctx.stroke();
    }

    // 移動処理
    if (keys['w'] || keys['z']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['a'] || keys['q']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;

    // プレイヤーの向き更新
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    // 敵の移動と描画
    enemies.forEach(e => {
        const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angleToPlayer) * 1.2;
        e.y += Math.sin(angleToPlayer) * 1.2;

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.fill();
        ctx.closePath();
        
        // HPバー
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(e.x - 15, e.y - 28, 30, 4);
        ctx.fillStyle = '#2ecc71';
        const hpBarWidth = (e.hp / (e.type === 'slime' ? 20 : 45)) * 30;
        ctx.fillRect(e.x - 15, e.y - 28, Math.max(0, hpBarWidth), 4);
    });

    // プレイヤーの描画
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
    ctx.beginPath();
    ctx.arc(0, 0, player.size, 0, Math.PI * 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fill();
    ctx.closePath();

    // 武器の向き
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, -3, 25, 6);
    
    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// 初期化起動
updateUI();
gameLoop();
