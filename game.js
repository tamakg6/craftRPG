// --- 疑似プレイヤーのステータス定義（本来は装備から計算） ---
const playerBase = {
    name: "たま",
    atk: 12941,
    def: 1183,
    maxHp: 317,
    spd: 15,
    luk: 1
};

// 詳細ログを一時保管するストレージ（IDと中身を紐付け）
let fightDetailLogs = {};
let logCounter = 0;

// --- 1. タブ切り替えシステム ---
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.content-view');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        item.classList.add('active');
        const target = item.getAttribute('data-target');
        document.getElementById(target).classList.add('active');
    });
});

// --- 2. 探索・戦闘シミュレータ (心臓部) ---
document.getElementById('btn-start-expedition').addEventListener('click', () => {
    // タブを自動でLOGに切り替え
    document.querySelector('[data-target="view-log"]').click();
    startExpedition();
});

function startExpedition() {
    document.getElementById('current-dungeon-name').innerText = "勇気の峡谷 (瘴気1) 6階";
    document.getElementById('btn-abort').disabled = false;
    
    // 毎回レベル1リセット
    let currentLv = 1;
    let currentExp = 0;
    let nextExp = 1050;
    let playerHp = playerBase.maxHp;

    let progress = 0;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const logList = document.getElementById('log-list');
    logList.innerHTML = ""; // 前回のログをクリア

    // 帰還予定時刻のダミー表示
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // 1分後に帰還
    document.getElementById('return-time-text').innerText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 擬似的な自動進行タイマー（4秒ごとに敵と戦う）
    const interval = setInterval(() => {
        progress += 25;
        progressBar.style.width = progress + "%";
        progressText.innerText = `${progress / 25}階を探索中`;

        // 敵の生成
        const enemies = ["フェアリー", "ファイアフェアリー", "ライトニングフェアリー"];
        const enemyName = enemies[Math.floor(Math.random() * enemies.length)];
        const enemyHp = 4524;
        const enemyAtk = 3549;

        // 戦闘計算 (ターン制ログの作成)
        logCounter++;
        const logId = `fight-${logCounter}`;
        const detailRows = [];

        // ターン1: 遭遇
        detailRows.push({ icon: "📜", text: `${enemyName}と対峙した \nたま Lv:${currentLv} HP:${playerHp}/${playerBase.maxHp} ATK:${playerBase.atk}\n${enemyName} HP:${enemyHp} ATK:${enemyAtk}` });
        
        // ターン2: プレイヤーの攻撃
        const damageToEnemy = Math.floor(playerBase.atk * (0.9 + Math.random() * 0.2));
        detailRows.push({ icon: "⚔️", text: `たまの攻撃！\n${enemyName}に ${damageToEnemy} のダメージ` });

        // ターン3: 撃破
        detailRows.push({ icon: "🌪️", text: `${enemyName}を倒した！` });

        // ターン4: 経験値獲得とレベルアップ処理
        currentExp += 500;
        let lvUpText = `500 の経験値を得た`;
        if (currentExp >= nextExp) {
            currentLv++;
            currentExp -= nextExp;
            lvUpText += `\nレベルアップ！ Lv.${currentLv}になった！`;
        }
        detailRows.push({ icon: "✨", text: lvUpText });

        // 詳細データを保管
        fightDetailLogs[logId] = {
            title: `${getNowTimeStr()} ${enemyName}を倒した`,
            body: detailRows
        };

        // メイン画面の【LOG】カードを生成して追加
        const card = document.createElement('div');
        card.className = 'log-card';
        card.setAttribute('data-log-id', logId);
        card.innerHTML = `
            <div class="log-card-left">
                <div class="log-card-icon">⚔️</div>
                <div class="log-card-info">
                    <div class="title">${getNowTimeStr()} ${enemyName}を倒した</div>
                    <div class="stats">Lv:${currentLv} HP:${playerHp}/${playerBase.maxHp} ATK:${playerBase.atk} DEF:${playerBase.def} EXP:${currentExp}/${nextExp}</div>
                </div>
            </div>
            <div class="log-card-arrow">＞</div>
        `;

        // カードクリックでポップアップを開くイベント
        card.addEventListener('click', () => openModal(logId));
        logList.insertBefore(card, logList.firstChild); // 最新のログを上に

        if (progress >= 100) {
            clearInterval(interval);
            document.getElementById('current-dungeon-name').innerText = "街に滞在中";
            progressText.innerText = "探索完了！";
            document.getElementById('btn-abort').disabled = true;
        }
    }, 2000);
}

// 時刻取得ヘルパー
function getNowTimeStr() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// --- 3. ポップアップ（モーダル）制御 ---
const modal = document.getElementById('detail-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');

function openModal(logId) {
    const data = fightDetailLogs[logId];
    if (!data) return;

    modalTitle.innerText = data.title;
    modalBody.innerHTML = "";

    data.body.forEach(row => {
        const div = document.createElement('div');
        div.className = 'modal-row';
        div.innerHTML = `
            <div class="modal-row-icon">${row.icon}</div>
            <div>${row.text.replace(/\n/g, '<br>')}</div>
        `;
        modalBody.appendChild(div);
    });

    modal.classList.remove('hidden');
}

document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
});
