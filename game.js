// ==========================================
// 1. グローバルゲームデータ（セーブ対象データ構造）
// ==========================================
let gameState = {
    materials: { "スライムの粘液": 4, "錆びた鉄くず": 2 },
    inventory: [
        { id: "init-w", type: "weapon", name: "こん棒", miasma: 50, atk: 2619, abilities: [{name:"腕力", lv:12}, {name:"腕力", lv:12}, {name:"腕力", lv:12}], equipped: true },
        { id: "init-a", type: "armor", name: "堅木の盾", miasma: 96, def: 1140, abilities: [{name:"腕力", lv:13}, {name:"腕力", lv:11}, {name:"腕力", lv:11}], equipped: true },
        { id: "init-ac", type: "accessory", name: "銅の指輪", miasma: 10, abilities: [{name:"幸運", lv:3}], equipped: true }
    ],
    collection: {
        "こん棒": { discovered: true, analysisExp: 20, analysisLv: 8 },
        "堅木の盾": { discovered: true, analysisExp: 50, analysisLv: 3 },
        "銅の指輪": { discovered: true, analysisExp: 0, analysisLv: 1 }
    }
};

// 特殊能力がステータス（Lv1かLvUPか）に与える影響の内部数値マッピング
const ABILITY_DATA_MAP = {
    "耐久": { target: "hp_lv1", baseValue: 50 },
    "腕力": { target: "str_lv1", baseValue: 50 },
    "頑丈": { target: "vit_lv1", baseValue: 50 },
    "機敏": { target: "spd_lv1", baseValue: 10 },
    "幸運": { target: "luk_lv1", baseValue: 5 },
    "体力の鍛錬": { target: "hp_lvUp", baseValue: 2 },
    "力の鍛錬": { target: "str_lvUp", baseValue: 1 },
    "守りの鍛錬": { target: "vit_lvUp", baseValue: 1 }
};

let activeFightLogs = {};
let logIdCounter = 0;

// ==========================================
// 2. タブコントロール＆UI初期化
// ==========================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
        
        item.classList.add('active');
        const targetView = item.getAttribute('data-target');
        document.getElementById(targetView).classList.add('active');

        // 各画面を開いた際のリフレッシュ処理
        if(targetView === "view-item") renderInventory();
        if(targetView === "view-collection") renderCollection();
        if(targetView === "view-status") calculateAndRenderStatus();
    });
});

// ==========================================
// 3. つよさ・ステータス計算システム (コア)
// ==========================================
function calculateAndRenderStatus() {
    let stats = {
        hp_lv1: 60,  str_lv1: 10,  vit_lv1: 10,  spd_lv1: 1,  luk_lv1: 1,
        hp_lvUp: 10, str_lvUp: 1,  vit_lvUp: 1,  spd_lvUp: 0, luk_lvUp: 0,
        hp_boost: 1.1, str_boost: 1.1, vit_boost: 1.1, spd_boost: 1.1, luk_boost: 1.1
    };

    let abilityTexts = [];
    let eqWeapon = null, eqArmor = null, eqAcc = null;

    gameState.inventory.forEach(item => {
        if (!item.equipped) return;
        if (item.type === "weapon") { eqWeapon = item; stats.str_lv1 += item.atk || 0; }
        if (item.type === "armor") { eqArmor = item; stats.vit_lv1 += item.def || 0; }
        if (item.type === "accessory") eqAcc = item;

        // 限界突破の倍率・ボーナス計算 (~50, ~150等の閾値判定)
        let dictData = gameState.collection[item.name] || { analysisLv: 1 };
        if (item.miasma >= 50) stats.str_boost += 0.2; // 攻撃ブーストx1.3の簡易表現
        if (item.miasma >= 200 && dictData.analysisLv >= 9) abilityTexts.push(`[セット効果発現] (${item.name})`);

        // アビリティ重複をステータス基礎値・成長力に適用
        item.abilities.forEach(ab => {
            let map = ABILITY_DATA_MAP[ab.name];
            if (map) {
                let gain = ab.lv * map.baseValue;
                stats[map.target] += gain;
                abilityTexts.push(`${item.name}: ${ab.name} Lv${ab.lv} (${map.target.includes('lv1') ? '基礎値' : '成長力'}+${gain})`);
            }
        });
    });

    // 画面への描画更新
    document.getElementById('eq-weapon-name').innerText = eqWeapon ? `${eqWeapon.name} (+${eqWeapon.atk}) ~${eqWeapon.miasma}` : "未装備";
    document.getElementById('eq-armor-name').innerText = eqArmor ? `${eqArmor.name} (+${eqArmor.def}) ~${eqArmor.miasma}` : "未装備";
    document.getElementById('eq-accessory-name').innerText = eqAcc ? `${eqAcc.name} ~${eqAcc.miasma}` : "未装備";

    const tbody = document.getElementById('status-table-body');
    tbody.innerHTML = `
        <tr><td>HP (体力)</td><td>${stats.hp_lv1}</td><td>↑${stats.hp_lvUp}</td><td>x${stats.hp_boost.toFixed(2)}</td></tr>
        <tr><td>STR (腕力)</td><td>${stats.str_lv1}</td><td>↑${stats.str_lvUp}</td><td>x${stats.str_boost.toFixed(2)}</td></tr>
        <tr><td>VIT (頑丈)</td><td>${stats.vit_lv1}</td><td>↑${stats.vit_lvUp}</td><td>x${stats.vit_boost.toFixed(2)}</td></tr>
        <tr><td>SPD (機敏)</td><td>${stats.spd_lv1}</td><td>↑${stats.spd_lvUp}</td><td>x${stats.spd_boost.toFixed(2)}</td></tr>
        <tr><td>LUK (幸運)</td><td>${stats.luk_lv1}</td><td>↑${stats.luk_lvUp}</td><td>x${stats.luk_boost.toFixed(2)}</td></tr>
    `;

    // 簡易レーティング計算
    let rating = Math.floor((stats.str_lv1 + stats.vit_lv1) * stats.str_boost);
    document.getElementById('status-rating-val').innerText = rating.toLocaleString();

    const abBox = document.getElementById('ability-detail-list');
    abBox.innerHTML = abilityTexts.length ? abilityTexts.map(t => `<div>${t}</div>`).join('') : "発動中の能力はありません。";
    
    return stats; // 戦闘処理用に戻す
}

// ==========================================
// 4. 自動探索・毎回Lv1戦闘シミュレータ
// ==========================================
document.querySelectorAll('.start-dungeon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const dungeonName = e.target.getAttribute('data-dungeon');
        const miasma = parseInt(e.target.getAttribute('data-miasma'));
        document.querySelector('[data-target="view-log"]').click(); // LOGタブへ自動遷移
        executeExpedition(dungeonName, miasma);
    });
});

function executeExpedition(dungeonName, miasmaLevel) {
    document.getElementById('current-dungeon-name').innerText = `${dungeonName} (瘴気度${miasmaLevel})`;
    document.getElementById('btn-abort').disabled = false;

    let currentLv = 1;
    let currentExp = 0;
    let nextExp = 1050;
    
    // 最新ステータス情報をロード
    let currentStats = calculateAndRenderStatus();
    let playerHp = currentStats.hp_lv1;

    let progress = 0;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const logList = document.getElementById('log-list');
    logList.innerHTML = ""; 

    const interval = setInterval(() => {
        progress += 25;
        progressBar.style.width = progress + "%";
        progressText.innerText = `${progress / 25}階層を突破中...`;

        // 敵の強さを瘴気度に応じて倍率ブースト
        const enemyMultiplier = 1 + (miasmaLevel * 1.5);
        const enemyName = miasmaLevel > 4 ? "魔王の残滓" : "ファイアフェアリー";
        const enemyHp = Math.floor(3000 * enemyMultiplier);
        const enemyAtk = Math.floor(800 * enemyMultiplier);

        logIdCounter++;
        const logId = `fight-id-${logIdCounter}`;
        const detailRows = [];

        // 遭遇ログ
        detailRows.push({ icon: "📜", text: `${enemyName}と対峙した\nたま Lv:${currentLv} HP:${playerHp}/${currentStats.hp_lv1}\n敵 HP:${enemyHp}` });
        
        // ターン計算
        let playerDmg = Math.floor(currentStats.str_lv1 * currentStats.str_boost * (0.9 + Math.random()*0.2));
        detailRows.push({ icon: "⚔️", text: `たまの攻撃！\n${enemyName}に ${playerDmg} の物理ダメージを与える` });
        detailRows.push({ icon: "🌪️", text: `${enemyName}を完全に撃破した。` });

        // レベルアップのリアルタイム計算（毎回Lv1リセットの醍醐味）
        currentExp += 400;
        let lvText = `400 の経験値を獲得。`;
        if (currentExp >= nextExp) {
            currentLv++;
            currentExp -= nextExp;
            // 装備の「鍛錬」効果がここで加算される
            currentStats.str_lv1 += currentStats.str_lvUp;
            currentStats.vit_lv1 += currentStats.vit_lvUp;
            lvText += `\n★ レベルアップ！ Lv.${currentLv} に到達。\n(腕力・頑丈が成長力分アップ！)`;
        }
        detailRows.push({ icon: "✨", text: lvText });

        // ドロップ素材の決定（素材特性＆瘴気度による侵食補正）
        let droppedMaterial = miasmaLevel === 0 ? "スライムの粘液" : "錆びた鉄くず";
        if(!gameState.materials[droppedMaterial]) gameState.materials[droppedMaterial] = 0;
        gameState.materials[droppedMaterial]++;
        detailRows.push({ icon: "🎒", text: `戦利品: 「${droppedMaterial}」を拾いバッグに格納した。` });

        // 詳細ポップアップ用のストレージにセーブ
        activeFightLogs[logId] = { title: `${dungeonName} ${progress/25}F 戦闘記録`, body: detailRows };

        // ログ画面にカード追加
        const card = document.createElement('div');
        card.className = 'log-card';
        card.setAttribute('data-id', logId);
        card.innerHTML = `
            <div class="log-card-left">
                <div class="log-card-icon">⚔️</div>
                <div class="log-card-info">
                    <div class="title">${enemyName} を討伐</div>
                    <div class="stats">Lv:${currentLv} ATK:${Math.floor(currentStats.str_lv1*currentStats.str_boost)} EXP:${currentExp}/${nextExp}</div>
                </div>
            </div>
            <div class="log-card-arrow">＞</div>
        `;
        card.addEventListener('click', () => openDetailModal(logId));
        logList.insertBefore(card, logList.firstChild);

        if (progress >= 100) {
            clearInterval(interval);
            document.getElementById('current-dungeon-name').innerText = "街に滞在中";
            progressText.innerText = "ダンジョンクリア！無事帰還。";
            document.getElementById('btn-abort').disabled = true;
        }
    }, 1500);
}

// ==========================================
// 5. 鍛冶屋クラフトシステム (素材ごとの傾向・侵食の平均化)
// ==========================================
document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-type');
        const recipe = e.target.getAttribute('data-recipe');

        // 必要素材のチェック
        if (recipe === "こん棒" && gameState.materials["スライムの粘液"] >= 2) {
            gameState.materials["スライムの粘液"] -= 2;
        } else if (recipe === "堅木の盾" && gameState.materials["錆びた鉄くず"] >= 2) {
            gameState.materials["錆びた鉄くず"] -= 2;
        } else if (recipe === "銅の指輪" && gameState.materials["スライムの粘液"] >= 1 && gameState.materials["錆びた鉄くず"] >= 1) {
            gameState.materials["スライムの粘液"]--;
            gameState.materials["錆びた鉄くず"]--;
        } else {
            alert("素材が足りません！ダンジョンを探索してください。");
            return;
        }

        // 侵食度を完全ランダム決定（平均値ロジックのベース）
        let generatedMiasma = Math.floor(Math.random() * 260); 
        
        // 素材ごとに付与されやすいアビリティ特性の抽選
        let potentialAbilities = recipe === "こん棒" ? ["腕力", "力の鍛錬", "耐久"] : ["頑丈", "守りの鍛錬", "機敏"];
        let rolledAbilities = [];
        for(let i=0; i<3; i++) { // 最大3つ重複あり
            let name = potentialAbilities[Math.floor(Math.random() * potentialAbilities.length)];
            let lv = Math.floor(Math.random() * 12) + 1;
            rolledAbilities.push({ name: name, lv: lv });
        }

        let newEquipment = {
            id: `item-${Date.now()}`,
            type: type,
            name: recipe,
            miasma: generatedMiasma,
            atk: type === "weapon" ? Math.floor(500 + generatedMiasma * 10) : 0,
            def: type === "armor" ? Math.floor(200 + generatedMiasma * 5) : 0,
            abilities: rolledAbilities,
            equipped: false
        };

        gameState.inventory.push(newEquipment);
        
        // 図鑑への新発見登録
        if(!gameState.collection[recipe]) {
            gameState.collection[recipe] = { discovered: true, analysisExp: 0, analysisLv: 1 };
        }

        alert(`クラフト大成功！\n【${recipe} (~${generatedMiasma})】を作成しバッグに格納しました。`);
    });
});

// ==========================================
// 6. ITEM (装備・フィルター) & 図鑑解析レンダラー
// ==========================================
function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = "";

    gameState.inventory.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        
        let abTexts = item.abilities.map(a => `${a.name} Lv${a.lv}`).join(' | ');
        let statBonus = item.type === "weapon" ? `ATK:${item.atk}` : (item.type === "armor" ? `DEF:${item.def}` : "");

        card.innerHTML = `
            <div class="item-card-main">
                <div class="item-icon-wrapper">
                    ${item.type==="weapon"?"⚔️":item.type==="armor"?"🛡️":"💍"}
                    <span class="item-miasma-badge">~${item.miasma}</span>
                    ${item.equipped ? '<span class="equip-tag">E</span>' : ''}
                </div>
                <div class="item-details">
                    <h4>${item.name} <span style="font-size:0.75rem; color:#aaa;">(${statBonus})</span></h4>
                    <div class="item-abilities">${abTexts}</div>
                </div>
            </div>
            <button class="equip-action-btn" onclick="toggleEquip('${item.id}')">${item.equipped ? '外す' : '装備'}</button>
        `;
        list.appendChild(card);
    });
}

window.toggleEquip = function(id) {
    let target = gameState.inventory.find(i => i.id === id);
    if (!target) return;
    
    if (!target.equipped) {
        // 同種のスロットを外す一括ルール
        gameState.inventory.forEach(i => { if(i.type === target.type) i.equipped = false; });
        target.equipped = true;
    } else {
        target.equipped = false;
    }
    renderInventory();
    calculateAndRenderStatus();
};

function renderCollection() {
    const list = document.getElementById('collection-list');
    list.innerHTML = "";

    Object.keys(gameState.collection).forEach(key => {
        let data = gameState.collection[key];
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.innerHTML = `
            <div>
                <strong>${key}</strong> <span style="color:#00e676;">解析Lv.${data.analysisLv}</span>
                <div class="analysis-bar-container"><div class="analysis-bar-fill" style="width: ${data.analysisExp}%"></div></div>
            </div>
            <button class="analyze-trigger-btn" onclick="executeAnalysis('${key}')">解析する</button>
        `;
        list.appendChild(card);
    });
}

window.executeAnalysis = function(key) {
    let data = gameState.collection[key];
    if(!data) return;

    data.analysisExp += 35;
    if(data.analysisExp >= 100) {
        data.analysisLv++;
        data.analysisExp = 0;
        alert(`🎉 ${key} の解析レベルが Lv.${data.analysisLv} に上昇！\n新しい限界突破効果のロックが解除されました。`);
    }
    renderCollection();
};

// ==========================================
// 7. モーダルダイアログポップアップ制御
// ==========================================
const modal = document.getElementById('detail-modal');
function openDetailModal(id) {
    const fight = activeFightLogs[id];
    if(!fight) return;

    document.getElementById('modal-title').innerText = fight.title;
    const bodyContainer = document.getElementById('modal-body');
    bodyContainer.innerHTML = "";

    fight.body.forEach(row => {
        const dRow = document.createElement('div');
        dRow.className = 'modal-row';
        dRow.innerHTML = `<div class="modal-row-icon">${row.icon}</div><div>${row.text.replace(/\n/g, '<br>')}</div>`;
        bodyContainer.appendChild(dRow);
    });
    modal.classList.remove('hidden');
}

document.getElementById('btn-close-modal').addEventListener('click', () => { modal.classList.add('hidden'); });

// 初回読み込み時の反映
calculateAndRenderStatus();
