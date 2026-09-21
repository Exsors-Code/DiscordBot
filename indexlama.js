require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// ==========================================
// ⚙️ KONFIGURASI — GANTI 2 INI!
// ==========================================
const PANEL_CHANNEL_ID = '1549088554406125608';
const LEADERBOARD_CHANNEL_ID = '1549099917899989072';
const LEADERBOARD_UPDATE_INTERVAL = 10000; // 10 detik

// ==========================================
// DATABASE (JSON) - Pure Node.js
// ==========================================
const DATA_FILE = path.join(__dirname, 'data.json');
const BACKUP_FOLDER = path.join(__dirname, 'backups');

if (!fs.existsSync(BACKUP_FOLDER)) {
    fs.mkdirSync(BACKUP_FOLDER);
}

function loadAllUsers() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, '{}', 'utf8');
            return new Map();
        }
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const obj = JSON.parse(raw || '{}');
        const map = new Map();
        for (const [userId, data] of Object.entries(obj)) {
            map.set(userId, data);
        }
        return map;
    } catch (err) {
        console.error('❌ Gagal load data.json:', err.message);
        return new Map();
    }
}

function saveAllUsers(userDataMap) {
    try {
        const obj = {};
        for (const [userId, data] of userDataMap) {
            obj[userId] = data;
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('❌ Gagal save data.json:', err.message);
        return false;
    }
}

function createBackup() {
    try {
        if (!fs.existsSync(DATA_FILE)) return false;

        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/T/, '_')
            .replace(/:/g, '-')
            .replace(/\..+/, '');

        const backupName = `data_backup_${timestamp}.json`;
        const backupPath = path.join(BACKUP_FOLDER, backupName);

        fs.copyFileSync(DATA_FILE, backupPath);

        // Simpan hanya 20 backup terakhir
        const files = fs.readdirSync(BACKUP_FOLDER)
            .filter(f => f.startsWith('data_backup_') && f.endsWith('.json'))
            .map(f => ({
                name: f,
                time: fs.statSync(path.join(BACKUP_FOLDER, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        for (let i = 20; i < files.length; i++) {
            fs.unlinkSync(path.join(BACKUP_FOLDER, files[i].name));
        }

        console.log(`💾 Backup dibuat: ${backupName}`);
        return true;
    } catch (err) {
        console.error('❌ Gagal membuat backup:', err.message);
        return false;
    }
}

// ==========================================
// DATA SHOP — TOOLS
// ==========================================
const SHOP_TOOLS = {
    lss:  { name: 'LSS',  price: 10000,    multiplier: 30,  invBonus: 5000,  blocksPerBreak: 3,  emoji: '🗡️' },
    lray: { name: 'LRAY', price: 100000,   multiplier: 50,  invBonus: 10000, blocksPerBreak: 7,  emoji: '🔫' },
    mray: { name: 'MRAY', price: 1000000,  multiplier: 100, invBonus: 15000, blocksPerBreak: 10, emoji: '⚔️' },
    gray: { name: 'GRAY', price: 10000000, multiplier: 250, invBonus: 20000, blocksPerBreak: 15, emoji: '🌟' }
};

const SHOP_BLOCKS = {
    dirt: { name: 'Dirt',        price: 100,  gemsMin: 1,  gemsMax: 5,   xpMin: 1,  xpMax: 5,   emoji: '🟫', desc: 'Block murah, reward kecil' },
    pog:  { name: "Pot O' Gems", price: 5000, gemsMin: 85, gemsMax: 100, xpMin: 85, xpMax: 100, emoji: '🥔', desc: 'Block OP, reward besar' }
};

const SHOP_ITEMS = {
    arroz:  { name: 'Arroz Con Pollo', price: 50000,  emoji: '🍗', duration: 300, desc: 'x2 Gems selama 5 menit' },
    clover: { name: 'Lucky Clover',    price: 250000, emoji: '🍀', duration: 300, desc: 'x2 XP selama 5 menit' }
};

const SHOP_LOCKS = {
    wl:   { name: 'WL',   emoji: '🔹', price: 10000,       wlValue: 1,       desc: 'White Lock' },
    dl:   { name: 'DL',   emoji: '🔸', price: 1000000,     wlValue: 100,     desc: 'Diamond Lock = 100 WL' },
    bgl:  { name: 'BGL',  emoji: '🔶', price: 100000000,   wlValue: 10000,   desc: 'Blue Gem Lock = 10.000 WL' },
    bglb: { name: 'BGLB', emoji: '🌟', price: 10000000000, wlValue: 1000000, desc: 'Blue Gem Lock Blue = 1.000.000 WL' }
};

const SKILLS = {
    mining_speed:     { name: 'Mining Speed',     emoji: '⛏️', maxLevel: 10, desc: 'Mempercepat auto farm' },
    gem_hunter:       { name: 'Gem Hunter',       emoji: '💎', maxLevel: 10, desc: '+10% Gems per level' },
    lucky_find:       { name: 'Lucky Find',       emoji: '🍀', maxLevel: 10, desc: '+2% peluang gems x10' },
    xp_boost:         { name: 'XP Boost',         emoji: '📈', maxLevel: 10, desc: '+10% XP per level' },
    inventory_master: { name: 'Inventory Master', emoji: '📦', maxLevel: 10, desc: '+5.000 kapasitas inventory' }
};

const BASE_RETURN_CHANCE = 0.10;
const MAX_CUSTOM_QTY = 1000000;

// ==========================================
// MULTI-USER MANAGEMENT
// ==========================================
const userDataMap = new Map();
const autoFarmIntervals = new Map();
const activeMessages = new Map();
const userThreads = new Map();

let leaderboardMessage = null;

function createUser(username) {
    return {
        username,
        level: 1, xp: 0, maxXp: 1000, skillPoints: 0,
        gems: 500000,
        blocks: { dirt: 500, pog: 0 },
        selectedBlock: 'dirt',
        ownedTools: [], equippedTool: null,
        skills: { mining_speed: 0, gem_hunter: 0, lucky_find: 0, xp_boost: 0, inventory_master: 0 },
        items: { arroz: 0, clover: 0 },
        activeBuffs: { arroz: 0, clover: 0 },
        locks: { wl: 1, dl: 0, bgl: 0, bglb: 0 },
        autoFarm: false,
        lastBreak: 'Auto Farm belum dinyalakan.',
        currentView: 'main',
        event: { name: 'Tidak Ada Event', gemsMult: 1, blocksMult: 1 }
    };
}

function getUD(userId, username) {
    if (!userDataMap.has(userId)) {
        userDataMap.set(userId, createUser(username || 'Unknown'));
    }
    const ud = userDataMap.get(userId);
    if (username) ud.username = username;
    return ud;
}

function saveUD(userId) {
    // Data sudah di memory, cukup tandai untuk di-save nanti oleh auto-save
    // (kita tetap pakai auto-save semua supaya sederhana)
}

// ==========================================
// HELPER
// ==========================================
function getTotalBlocks(ud) { return ud.blocks.dirt + ud.blocks.pog; }
function getTotalWL(ud) {
    const { wl, dl, bgl, bglb } = ud.locks;
    return wl + (dl * 100) + (bgl * 10000) + (bglb * 1000000);
}
function isBuffActive(ud, key) { return Date.now() < ud.activeBuffs[key]; }
function getActiveBuffText(ud) {
    const active = [];
    if (isBuffActive(ud, 'arroz')) active.push(`🍗 Arroz • ${Math.ceil((ud.activeBuffs.arroz - Date.now())/1000)}s`);
    if (isBuffActive(ud, 'clover')) active.push(`🍀 Clover • ${Math.ceil((ud.activeBuffs.clover - Date.now())/1000)}s`);
    return active.length > 0 ? active.join(' | ') : '*(Tidak ada)*';
}
function checkLevelUp(ud) {
    let leveledUp = 0;
    while (ud.xp >= ud.maxXp) {
        ud.xp -= ud.maxXp; ud.level++; ud.skillPoints++;
        ud.maxXp = Math.floor(ud.maxXp * 1.25); leveledUp++;
    }
    return leveledUp;
}

// ==========================================
// EMBEDS & BUTTONS (sama seperti sebelumnya)
// ==========================================
function mainEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const selected = SHOP_BLOCKS[ud.selectedBlock];
    const selectedQty = ud.blocks[ud.selectedBlock];
    const autoStatus = ud.autoFarm ? '**ON** • Every 1s' : '**OFF**';
    const far = tool ? tool.blocksPerBreak : 1;
    const ev = ud.event;

    return new EmbedBuilder()
        .setColor(ud.autoFarm ? '#2b2d31' : '#1e1f22')
        .setTitle('🪓 Farming')
        .setDescription(`**@${ud.username}** (Level: ${ud.level})\nXP: **${ud.xp.toLocaleString()}** / ${ud.maxXp.toLocaleString()}`)
        .addFields(
            { name: '🎉 Event Aktif', value: `**${ev.name}**\n> 💎 x${ev.gemsMult} Gems | 🟫 x${ev.blocksMult} Blocks`, inline: false },
            { name: 'Tool:', value: tool ? `${tool.emoji} ${tool.name} x${tool.multiplier} • ${far} far` : `⚪ Tidak ada (x1) • 1 far`, inline: false },
            { name: 'Buff Active:', value: getActiveBuffText(ud), inline: false },
            { name: '⛏️ Selected Block:', value: `${selected.emoji} **${selected.name}** (x${selectedQty.toLocaleString()})\n> Reward: ${selected.gemsMin}-${selected.gemsMax} 💎 | ${selected.xpMin}-${selected.xpMax} XP`, inline: false },
            { name: 'Inventory:', value: `🟫 Dirt: ${ud.blocks.dirt.toLocaleString()}\n🥔 POG: ${ud.blocks.pog.toLocaleString()}`, inline: true },
            { name: 'Gems:', value: `${Math.floor(ud.gems).toLocaleString()} 💰`, inline: true },
            { name: '⭐ SP:', value: `**${ud.skillPoints}** SP`, inline: true },
            { name: 'Auto Farm:', value: autoStatus, inline: false },
            { name: 'Last Break:', value: ud.lastBreak, inline: false }
        );
}

function mainButtons(ud) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_farm').setLabel('🌾 Farm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('nav_shop_blocks').setLabel('🔄 Change Block').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_event').setLabel('🎉 Event').setStyle(ButtonStyle.Danger)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_shop').setLabel('🛒 Shop').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_items').setLabel('🎒 Items').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_profile').setLabel('👤 Profile').setStyle(ButtonStyle.Primary)
    );
    const toggleStyle = ud.autoFarm ? ButtonStyle.Danger : ButtonStyle.Success;
    const toggleLabel = ud.autoFarm ? 'Stop Auto Farm' : 'Start Auto Farm';
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_skills').setLabel('⭐ Skills').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('nav_tools').setLabel('🛠️ Tools').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_toggle_auto').setLabel(toggleLabel).setStyle(toggleStyle)
    );
    return [row1, row2, row3];
}

function eventEmbed(ud) {
    const ev = ud.event;
    return new EmbedBuilder().setColor('#E91E63').setTitle('🎉 Event Management')
        .setDescription(
            `### Event Aktif: **${ev.name}**\n` +
            `> 💎 **Gems Multiplier**: **x${ev.gemsMult}**\n` +
            `> 🟫 **Blocks Multiplier**: **x${ev.blocksMult}**\n` +
            `> 📈 XP ikut kena multiplier Gems (dengan rate sama)\n\n` +
            `**Cara pakai command:**\n` +
            `> \`/event gems:<angka> blocks:<angka>\`\n` +
            `> Contoh: \`/event gems:100 blocks:10\`\n\n` +
            `**Atau pakai tombol cepat di bawah** 👇`
        )
        .setFooter({ text: 'Gunakan /event untuk nilai kustom berapapun' });
}

function eventButtons(ud) {
    const gemOpts = [1, 2, 3, 5, 10];
    const blockOpts = [1, 2, 3, 5, 10];
    const rowGems = new ActionRowBuilder();
    for (const v of gemOpts) {
        rowGems.addComponents(new ButtonBuilder().setCustomId(`event_gems_${v}`).setLabel(`💎 x${v}`)
            .setStyle(ud.event.gemsMult === v ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(ud.event.gemsMult === v));
    }
    const rowBlocks = new ActionRowBuilder();
    for (const v of blockOpts) {
        rowBlocks.addComponents(new ButtonBuilder().setCustomId(`event_blocks_${v}`).setLabel(`🟫 x${v}`)
            .setStyle(ud.event.blocksMult === v ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(ud.event.blocksMult === v));
    }
    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('event_reset').setLabel('🔄 Reset (x1)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('nav_main').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary)
    );
    return [rowGems, rowBlocks, rowNav];
}

function shopMainEmbed(ud) {
    const totalWL = getTotalWL(ud);
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop')
        .setDescription('Pilih kategori yang ingin kamu buka:')
        .addFields(
            { name: '🛠️ Tools', value: 'Beli tool boost farming', inline: true },
            { name: '🟫 Blocks', value: 'Beli block untuk farm', inline: true },
            { name: '🎒 Items', value: 'Beli consumable buff', inline: true },
            { name: '🔒 Locks', value: 'Beli lock untuk koleksi', inline: true },
            { name: '💰 Total Kekayaan', value: `**${totalWL.toLocaleString()} WL**`, inline: false }
        )
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()} 💰` });
}
function shopMainButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop_tools').setLabel('🛠️ Tools').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_shop_blocks').setLabel('🟫 Blocks').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_shop_items').setLabel('🎒 Items').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_shop_locks').setLabel('🔒 Locks').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_main').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopToolsEmbed(ud) {
    const lines = ['**🛠️ TOOLS**'];
    for (const key in SHOP_TOOLS) {
        const t = SHOP_TOOLS[key];
        const owned = ud.ownedTools.includes(key) ? ' ✅' : '';
        lines.push(`${t.emoji} **${t.name}**${owned} — ${t.price.toLocaleString()} 💰\n> x${t.multiplier} Gems | ⛏️ **${t.blocksPerBreak} far** | +${t.invBonus.toLocaleString()} Inv`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — 🛠️ Tools')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()} 💰 • Beli → Equip via menu Tools` });
}
function shopToolsButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_lss').setLabel('Beli LSS').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_lray').setLabel('Beli LRAY').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_mray').setLabel('Beli MRAY').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_gray').setLabel('Beli GRAY').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopBlocksEmbed(ud) {
    const lines = ['**🟫 BLOCKS**'];
    for (const key in SHOP_BLOCKS) {
        const b = SHOP_BLOCKS[key];
        const isSelected = ud.selectedBlock === key ? ' **[SELECTED]**' : '';
        lines.push(`${b.emoji} **${b.name}**${isSelected} — ${b.price.toLocaleString()} 💰/block\n> Reward: **${b.gemsMin}-${b.gemsMax} 💎** | **${b.xpMin}-${b.xpMax} XP**\n> ${b.desc}\n> 📦 Kamu punya: **${ud.blocks[key].toLocaleString()}** block`);
    }
    return new EmbedBuilder().setColor('#8B4513').setTitle('🛒 Shop — 🟫 Blocks')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()} 💰 • ✏️ = custom jumlah` });
}
function shopBlocksButtons(ud) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buyblock_dirt_1').setLabel('🟫 Dirt x1').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buyblock_dirt_100').setLabel('🟫 Dirt x100').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customblock_dirt').setLabel('✏️ Dirt Custom').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('selectblock_dirt').setLabel('Pakai Dirt').setStyle(ButtonStyle.Secondary).setDisabled(ud.selectedBlock === 'dirt')
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buyblock_pog_1').setLabel('🥔 POG x1').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buyblock_pog_100').setLabel('🥔 POG x100').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customblock_pog').setLabel('✏️ POG Custom').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('selectblock_pog').setLabel('Pakai POG').setStyle(ButtonStyle.Secondary).setDisabled(ud.selectedBlock === 'pog')
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopItemsEmbed(ud) {
    const lines = [];
    for (const key in SHOP_ITEMS) {
        const i = SHOP_ITEMS[key];
        lines.push(`${i.emoji} **${i.name}** — ${i.price.toLocaleString()} 💰\n> ${i.desc}\n> Dimiliki: ${ud.items[key]}`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — 🎒 Items')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()} 💰` });
}
function shopItemsButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_arroz').setLabel('🍗 Beli Arroz').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_clover').setLabel('🍀 Beli Clover').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopLocksEmbed(ud) {
    const lines = [];
    for (const key in SHOP_LOCKS) {
        const l = SHOP_LOCKS[key];
        lines.push(`${l.emoji} **${l.name}** — ${l.price.toLocaleString()} 💰\n> ${l.desc}\n> 💎 Nilai: **${l.wlValue.toLocaleString()} WL**\n> 📦 Kamu punya: **${ud.locks[key].toLocaleString()}** ${l.name}`);
    }
    const totalWL = getTotalWL(ud);
    return new EmbedBuilder().setColor('#F1C40F').setTitle('🛒 Shop — 🔒 Locks')
        .setDescription(lines.join('\n\n'))
        .addFields({ name: '💰 Total Kekayaanmu', value: `**${totalWL.toLocaleString()} WL**`, inline: false })
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()} 💰 • ✏️ = custom jumlah` });
}
function shopLocksButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buylock_wl').setLabel('🔹 WL x1').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buylock_dl').setLabel('🔸 DL x1').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buylock_bgl').setLabel('🔶 BGL x1').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buylock_bglb').setLabel('🌟 BGLB x1').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('customlock_wl').setLabel('✏️ WL Custom').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('customlock_dl').setLabel('✏️ DL Custom').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('customlock_bgl').setLabel('✏️ BGL Custom').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('customlock_bglb').setLabel('✏️ BGLB Custom').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function skillsEmbed(ud) {
    const totalSkillLvl = Object.values(ud.skills).reduce((a,b)=>a+b,0);
    const totalMax = Object.values(SKILLS).reduce((a,b)=>a+b.maxLevel,0);
    return new EmbedBuilder().setColor('#9B59B6').setTitle('⭐ Skills')
        .setDescription(
            `### ⭐ Skill Points: **${ud.skillPoints}** SP\n` +
            `> Setiap naik **Level**, kamu dapat **+1 SP**.\n` +
            `> Setiap upgrade skill membutuhkan **1 SP**.\n` +
            `> Total Skill Level: **${totalSkillLvl} / ${totalMax}**\n\n` +
            `**Daftar Skill:**\n` +
            Object.entries(SKILLS).map(([key, s]) => {
                const lvl = ud.skills[key];
                const isMax = lvl >= s.maxLevel;
                const status = isMax ? '**MAX** ✅' : `Lv. ${lvl}/${s.maxLevel}`;
                return `${s.emoji} **${s.name}** — ${status}\n> ${s.desc}`;
            }).join('\n\n')
        )
        .setFooter({ text: `Level kamu: ${ud.level} • SP: ${ud.skillPoints}` });
}
function skillsButtons(ud) {
    const sp = ud.skillPoints;
    const dis = (key) => sp <= 0 || ud.skills[key] >= SKILLS[key].maxLevel;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('up_mining_speed').setLabel('⛏️ Mining').setStyle(ButtonStyle.Success).setDisabled(dis('mining_speed')),
            new ButtonBuilder().setCustomId('up_gem_hunter').setLabel('💎 Gem Hunter').setStyle(ButtonStyle.Success).setDisabled(dis('gem_hunter')),
            new ButtonBuilder().setCustomId('up_lucky_find').setLabel('🍀 Lucky').setStyle(ButtonStyle.Success).setDisabled(dis('lucky_find'))
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('up_xp_boost').setLabel('📈 XP Boost').setStyle(ButtonStyle.Success).setDisabled(dis('xp_boost')),
            new ButtonBuilder().setCustomId('up_inventory_master').setLabel('📦 Inv Master').setStyle(ButtonStyle.Success).setDisabled(dis('inventory_master')),
            new ButtonBuilder().setCustomId('nav_main').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function itemsEmbed(ud) {
    return new EmbedBuilder().setColor('#E67E22').setTitle('🎒 Items')
        .setDescription(
            `🍗 **Arroz Con Pollo** x${ud.items.arroz}\n> x2 Gems selama 5 menit\n\n` +
            `🍀 **Lucky Clover** x${ud.items.clover}\n> x2 XP selama 5 menit`
        )
        .setFooter({ text: 'Beli item ini di Shop → Items' });
}
function itemsButtons(ud) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('use_arroz').setLabel('🍗 Pakai Arroz').setStyle(ButtonStyle.Primary).setDisabled(ud.items.arroz <= 0),
        new ButtonBuilder().setCustomId('use_clover').setLabel('🍀 Pakai Clover').setStyle(ButtonStyle.Primary).setDisabled(ud.items.clover <= 0),
        new ButtonBuilder().setCustomId('nav_main').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary)
    )];
}

function toolsEmbed(ud) {
    if (ud.ownedTools.length === 0) {
        return new EmbedBuilder().setColor('#3498DB').setTitle('🛠️ Tools')
            .setDescription('❌ Kamu belum punya tool apapun.\n> Beli dulu di **Shop → Tools**!');
    }
    const lines = [];
    for (const key of ud.ownedTools) {
        const t = SHOP_TOOLS[key];
        const isEquipped = ud.equippedTool === key;
        lines.push(`${t.emoji} **${t.name}** ${isEquipped ? '**[EQUIPPED]**' : ''}\n> x${t.multiplier} Gems | ⛏️ ${t.blocksPerBreak} far | +${t.invBonus.toLocaleString()} Inv`);
    }
    return new EmbedBuilder().setColor('#3498DB').setTitle('🛠️ Tools')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Klik tool untuk memakainya 👇' });
}
function toolsButtons(ud) {
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let count = 0;
    currentRow.addComponents(new ButtonBuilder().setCustomId('unequip_tool').setLabel('❌ Unequip').setStyle(ButtonStyle.Danger));
    count++;
    for (const key of ud.ownedTools) {
        if (count >= 5) { rows.push(currentRow); currentRow = new ActionRowBuilder(); count = 0; }
        const t = SHOP_TOOLS[key];
        const isEquipped = ud.equippedTool === key;
        currentRow.addComponents(new ButtonBuilder().setCustomId(`equip_${key}`).setLabel(`${t.emoji} ${t.name}`)
            .setStyle(isEquipped ? ButtonStyle.Success : ButtonStyle.Primary).setDisabled(isEquipped));
        count++;
    }
    if (count >= 5) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
    currentRow.addComponents(new ButtonBuilder().setCustomId('nav_main').setLabel('⬅️ Back').setStyle(ButtonStyle.Secondary));
    rows.push(currentRow);
    return rows;
}

function profileEmbed(ud) {
    const totalWL = getTotalWL(ud);
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    return new EmbedBuilder().setColor('#F1C40F').setTitle(`👤 Profile — ${ud.username}`)
        .addFields(
            { name: '💎 Gems', value: `${Math.floor(ud.gems).toLocaleString()} 💰`, inline: true },
            { name: '🏆 Level', value: `${ud.level} (XP: ${ud.xp.toLocaleString()}/${ud.maxXp.toLocaleString()})`, inline: true },
            { name: '⭐ Skill Points', value: `${ud.skillPoints} SP`, inline: true },
            { name: '🛠️ Tool', value: tool ? `${tool.emoji} ${tool.name}` : 'Tidak ada', inline: true },
            { name: '🟫 Dirt', value: ud.blocks.dirt.toLocaleString(), inline: true },
            { name: '🥔 POG', value: ud.blocks.pog.toLocaleString(), inline: true },
            { name: '💰 Total WL', value: `**${totalWL.toLocaleString()} WL**`, inline: false }
        );
}

function renderEmbed(ud) {
    switch (ud.currentView) {
        case 'shop': return shopMainEmbed(ud);
        case 'shop_tools': return shopToolsEmbed(ud);
        case 'shop_blocks': return shopBlocksEmbed(ud);
        case 'shop_items': return shopItemsEmbed(ud);
        case 'shop_locks': return shopLocksEmbed(ud);
        case 'skills': return skillsEmbed(ud);
        case 'items': return itemsEmbed(ud);
        case 'tools': return toolsEmbed(ud);
        case 'profile': return profileEmbed(ud);
        case 'event': return eventEmbed(ud);
        default: return mainEmbed(ud);
    }
}

function renderButtons(ud) {
    switch (ud.currentView) {
        case 'shop': return shopMainButtons();
        case 'shop_tools': return shopToolsButtons();
        case 'shop_blocks': return shopBlocksButtons(ud);
        case 'shop_items': return shopItemsButtons();
        case 'shop_locks': return shopLocksButtons();
        case 'skills': return skillsButtons(ud);
        case 'items': return itemsButtons(ud);
        case 'tools': return toolsButtons(ud);
        case 'event': return eventButtons(ud);
        default: return mainButtons(ud);
    }
}

// ==========================================
// FARMING LOGIC
// ==========================================
function doBreak(ud) {
    if (getTotalBlocks(ud) <= 0) {
        ud.autoFarm = false;
        ud.lastBreak = '❌ Semua block habis! Auto Farm dimatikan.';
        return { switched: true };
    }

    let blockType = ud.selectedBlock;
    if (ud.blocks[blockType] <= 0) {
        // Auto switch
        if (ud.blocks.dirt > 0) blockType = 'dirt';
        else if (ud.blocks.pog > 0) blockType = 'pog';
        else {
            ud.autoFarm = false;
            ud.lastBreak = '❌ Semua block habis!';
            return { switched: true };
        }
        ud.selectedBlock = blockType;
    }

    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const blocksToBreak = tool ? tool.blocksPerBreak : 1;
    const actualBreak = Math.min(blocksToBreak, ud.blocks[blockType]);
    ud.blocks[blockType] -= actualBreak;

    const bd = SHOP_BLOCKS[blockType];
    const ev = ud.event;

    // Gems
    const gemSkillMult = 1 + (ud.skills.gem_hunter * 0.10);
    const gemBuffMult = isBuffActive(ud, 'arroz') ? 2 : 1;
    let totalGems = 0;
    for (let i = 0; i < actualBreak; i++) {
        let g = Math.floor(Math.random() * (bd.gemsMax - bd.gemsMin + 1)) + bd.gemsMin;
        g = Math.floor(g * gemSkillMult * gemBuffMult * ev.gemsMult);
        if (Math.random() < ud.skills.lucky_find * 0.02) g *= 10;
        totalGems += g;
    }

    // XP
    const xpSkillMult = 1 + (ud.skills.xp_boost * 0.10);
    const xpBuffMult = isBuffActive(ud, 'clover') ? 2 : 1;
    let totalXp = 0;
    for (let i = 0; i < actualBreak; i++) {
        const baseXp = Math.floor(Math.random() * (bd.xpMax - bd.xpMin + 1)) + bd.xpMin;
        totalXp += Math.floor(baseXp * xpSkillMult * xpBuffMult * ev.gemsMult);
    }

    // Block return
    let returned = 0;
    for (let i = 0; i < actualBreak; i++) {
        if (Math.random() < BASE_RETURN_CHANCE) returned++;
    }
    returned = Math.floor(returned * ev.blocksMult);
    ud.blocks[blockType] += returned;

    ud.gems += totalGems;
    ud.xp += totalXp;
    const levelsGained = checkLevelUp(ud);

    return { gemsGained: totalGems, xpGained: totalXp, blockType, levelsGained, blocksBroken: actualBreak, returned };
}

function formatBreakLog(result, prefix = 'Auto') {
    const bd = SHOP_BLOCKS[result.blockType];
    let msg = `${prefix} [${bd.emoji} ${bd.name}]: -${result.blocksBroken} block`;
    if (result.returned > 0) msg += ` (+${result.returned} returned)`;
    msg += ` → +${result.gemsGained.toLocaleString()} 💰 / +${result.xpGained.toLocaleString()} XP`;
    if (result.levelsGained > 0) msg += ` 🎉 **LEVEL UP! +${result.levelsGained} SP**`;
    return msg;
}

// ==========================================
// AUTO FARM
// ==========================================
function startAutoFarm(userId) {
    if (autoFarmIntervals.has(userId)) return;
    const ud = userDataMap.get(userId);
    if (!ud) return;
    const interval = Math.max(500, 1000 - ud.skills.mining_speed * 50);

    const intervalId = setInterval(async () => {
        const currentUd = userDataMap.get(userId);
        if (!currentUd || !currentUd.autoFarm) { stopAutoFarm(userId); return; }
        const result = doBreak(currentUd);
        if (result && !result.switched) currentUd.lastBreak = formatBreakLog(result, 'Auto');
        const msg = activeMessages.get(userId);
        if (msg) {
            try { await msg.edit({ embeds: [renderEmbed(currentUd)], components: renderButtons(currentUd) }); }
            catch (e) { stopAutoFarm(userId); }
        } else stopAutoFarm(userId);
    }, interval);
    autoFarmIntervals.set(userId, intervalId);
}
function stopAutoFarm(userId) {
    const id = autoFarmIntervals.get(userId);
    if (id) { clearInterval(id); autoFarmIntervals.delete(userId); }
}

// ==========================================
// MODAL HELPERS
// ==========================================
function buildBuyModal(title, customId) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    const input = new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('Jumlah yang mau dibeli')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 500')
        .setRequired(true)
        .setMaxLength(10);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

function generateLeaderboardEmbed() {
    const sorted = [...userDataMap.values()]
        .sort((a, b) => b.gems - a.gems)
        .slice(0, 10);

    const lines = sorted.map((ud, i) => {
        const medal = ['🥇', '🥈', '🥉'][i] || `**${i + 1}.**`;
        return `${medal} **${ud.username}** — ${Math.floor(ud.gems).toLocaleString()} 💰`;
    });

    return new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🏆 Leaderboard Gems')
        .setDescription(lines.length > 0 ? lines.join('\n') : 'Belum ada data')
        .setFooter({ text: `Update setiap ${LEADERBOARD_UPDATE_INTERVAL / 1000} detik` })
        .setTimestamp();
}

function refreshLeaderboard() {
    if (!leaderboardMessage) return;
    leaderboardMessage.edit({ embeds: [generateLeaderboardEmbed()] }).catch(() => {});
}

// ==========================================
// 🚀 BOT READY
// ==========================================
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} siap!`);

    // ===== LOAD DATA DARI FILE =====
    try {
        const loaded = loadAllUsers();
        for (const [userId, data] of loaded) {
            userDataMap.set(userId, data);
        }
        console.log(`📦 Loaded ${userDataMap.size} player dari data.json`);
    } catch (err) {
        console.error('❌ Gagal load data:', err.message);
    }

    // ===== AUTO SAVE SETIAP 1 MENIT =====
    setInterval(() => {
        const success = saveAllUsers(userDataMap);
        if (success) {
            console.log(`💾 Auto-save ${userDataMap.size} player`);
        }
    }, 60_000);

    // ===== BACKUP OTOMATIS SETIAP 30 MENIT =====
    setInterval(() => {
        createBackup();
    }, 30 * 60 * 1000);

    // Backup pertama 10 detik setelah start
    setTimeout(() => createBackup(), 10_000);

    // ==========================================
    // 🧹 BERSIH-BERSIH + KIRIM PANEL BARU
    // ==========================================
    if (PANEL_CHANNEL_ID && PANEL_CHANNEL_ID !== 'MASUKKAN_CHANNEL_ID_PANEL_DISINI') {
        try {
            const channel = await client.channels.fetch(PANEL_CHANNEL_ID);

            // Hapus pesan panel lama
            const messages = await channel.messages.fetch({ limit: 50 });
            let deletedPanel = 0;
            for (const msg of messages.values()) {
                if (msg.author.id === client.user.id && msg.components.length > 0) {
                    await msg.delete().catch(() => {});
                    deletedPanel++;
                }
            }
            console.log(`🗑️ Hapus ${deletedPanel} panel lama`);

            // Hapus thread farming lama
            let deletedThreads = 0;
            let failedThreads = 0;

            async function safeDeleteThread(thread) {
                try {
                    if (thread.archived) {
                        try {
                            await thread.setArchived(false, 'Cleanup restart');
                            await new Promise(r => setTimeout(r, 500));
                        } catch (e) {}
                    }
                    await thread.delete('Cleanup restart');
                    return true;
                } catch (e) {
                    return false;
                }
            }

            try {
                const active = await channel.threads.fetchActive();
                for (const thread of active.threads.values()) {
                    if (thread.name.startsWith('🌱')) {
                        const ok = await safeDeleteThread(thread);
                        if (ok) deletedThreads++; else failedThreads++;
                    }
                }
            } catch (e) {}

            for (const type of ['public', 'private']) {
                try {
                    let before = undefined;
                    let keepGoing = true;
                    let fetchCount = 0;

                    while (keepGoing && fetchCount < 20) {
                        fetchCount++;
                        const archived = await channel.threads.fetchArchived({ type, limit: 100, before });
                        if (!archived.threads || archived.threads.size === 0) {
                            keepGoing = false;
                            break;
                        }
                        for (const thread of archived.threads.values()) {
                            if (thread.name.startsWith('🌱')) {
                                const ok = await safeDeleteThread(thread);
                                if (ok) deletedThreads++; else failedThreads++;
                            }
                        }
                        const lastThread = archived.threads.last();
                        const nextBefore = lastThread?.archivedAt;
                        if (!nextBefore || nextBefore === before) keepGoing = false;
                        else before = nextBefore;
                    }
                } catch (e) {}
            }

            console.log(`🗑️ Hapus ${deletedThreads} thread farming lama${failedThreads > 0 ? ` (${failedThreads} gagal)` : ''}`);

            userThreads.clear();
            activeMessages.clear();
            console.log(`🧹 Cache thread & message di-reset`);

            // Kirim panel baru
            const embed = new EmbedBuilder().setColor('#57F287').setTitle('🌱 Growcord Farming')
                .setDescription(
                    'Welcome to **Growcord**!\n\n' +
                    'Press **Start Farming** below or use `/farming` to open your private farming thread.\n' +
                    'Your thread contains your Farm, Shop, Items, Profile, Tools, and Skills menus.\n\n' +
                    'Your existing private farm thread will be reused whenever you run `/farming` again.'
                )
                .setFooter({ text: 'Growcord Farm Guide' });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('start_farming').setLabel('Start Farming').setEmoji('📖').setStyle(ButtonStyle.Success)
            );
            await channel.send({ embeds: [embed], components: [row] });
            console.log('📖 Panel baru terkirim!');
        } catch (err) { console.error('❌ Gagal setup panel:', err.message); }
    } else {
        console.log('⚠️ PANEL_CHANNEL_ID belum di-set!');
    }

    // ==========================================
    // 🏆 LEADERBOARD LIVE SETUP
    // ==========================================
    if (LEADERBOARD_CHANNEL_ID && LEADERBOARD_CHANNEL_ID !== 'MASUKKAN_CHANNEL_ID_LEADERBOARD_DISINI') {
        try {
            const lc = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
            const msgs = await lc.messages.fetch({ limit: 30 });
            for (const m of msgs.values()) {
                if (m.author.id === client.user.id) await m.delete().catch(() => {});
            }
            leaderboardMessage = await lc.send({ embeds: [generateLeaderboardEmbed()] });
            console.log('🏆 Leaderboard live aktif!');
            setInterval(refreshLeaderboard, LEADERBOARD_UPDATE_INTERVAL);
        } catch (err) { console.error('❌ Gagal setup leaderboard:', err.message); }
    } else {
        console.log('⚠️ LEADERBOARD_CHANNEL_ID belum di-set.');
    }
});

// ==========================================
// INTERACTION HANDLER
// ==========================================
client.on('interactionCreate', async interaction => {

    // 1. SLASH COMMAND
    if (interaction.isChatInputCommand()) {
        const userId = interaction.user.id;

        if (interaction.commandName === 'farming') {
            const ud = getUD(userId, interaction.user.username);
            ud.currentView = 'main';
            const msg = await interaction.reply({ embeds: [renderEmbed(ud)], components: renderButtons(ud), fetchReply: true });
            activeMessages.set(userId, msg);
        }
        else if (interaction.commandName === 'event') {
            const ud = getUD(userId, interaction.user.username);
            const gemsMult = interaction.options.getInteger('gems');
            const blocksMult = interaction.options.getInteger('blocks');
            ud.event.gemsMult = gemsMult;
            ud.event.blocksMult = blocksMult;
            ud.event.name = `Custom Event (💎 x${gemsMult}, 🟫 x${blocksMult})`;
            const msg = activeMessages.get(userId);
            if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
            await interaction.reply({ content: `✅ Event diupdate!\n> 💎 Gems & 📈 XP: **x${gemsMult}**\n> 🟫 Blocks return: **x${blocksMult}**`, flags: 64 });
        }
        return;
    }

    // 2. MODAL SUBMIT
    if (interaction.isModalSubmit()) {
        const userId = interaction.user.id;
        const ud = getUD(userId, interaction.user.username);

        const qtyRaw = interaction.fields.getTextInputValue('quantity');
        const qty = parseInt(qtyRaw);
        if (isNaN(qty) || qty <= 0 || qty > MAX_CUSTOM_QTY) {
            return interaction.reply({ content: `❌ Jumlah tidak valid! Masukkan angka 1 - ${MAX_CUSTOM_QTY.toLocaleString()}.`, flags: 64 });
        }

        let responseMsg = '';

        if (interaction.customId.startsWith('modal_buyblock_')) {
            const key = interaction.customId.replace('modal_buyblock_', '');
            const b = SHOP_BLOCKS[key];
            if (!b) return interaction.reply({ content: '❌ Block tidak valid.', flags: 64 });
            const totalCost = b.price * qty;
            if (ud.gems < totalCost) return interaction.reply({ content: `❌ Gems kurang! Butuh **${totalCost.toLocaleString()} 💰**`, flags: 64 });
            ud.gems -= totalCost;
            ud.blocks[key] += qty;
            responseMsg = `✅ Beli **${b.emoji} ${b.name} x${qty.toLocaleString()}** (-${totalCost.toLocaleString()} 💰)`;
        }
        else if (interaction.customId.startsWith('modal_buylock_')) {
            const key = interaction.customId.replace('modal_buylock_', '');
            const l = SHOP_LOCKS[key];
            if (!l) return interaction.reply({ content: '❌ Lock tidak valid.', flags: 64 });
            const totalCost = l.price * qty;
            if (ud.gems < totalCost) return interaction.reply({ content: `❌ Gems kurang! Butuh **${totalCost.toLocaleString()} 💰**`, flags: 64 });
            ud.gems -= totalCost;
            ud.locks[key] += qty;
            const totalWL = getTotalWL(ud);
            responseMsg = `✅ Beli **${l.emoji} ${l.name} x${qty.toLocaleString()}** (+${(l.wlValue * qty).toLocaleString()} WL)\n> Total: **${totalWL.toLocaleString()} WL**`;
        }

        const msg = activeMessages.get(userId);
        if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }

        refreshLeaderboard();
        return interaction.reply({ content: responseMsg, flags: 64 });
    }

    // 3. BUTTONS
    if (!interaction.isButton()) return;
    const id = interaction.customId;
    const userId = interaction.user.id;
    const ud = getUD(userId, interaction.user.username);

    let ephemeralMsg = null;
    let ephemeralError = false;

    if (id === 'start_farming') {
        let threadId = userThreads.get(userId);
        let thread = null;
        if (threadId) {
            try {
                thread = await interaction.guild.channels.fetch(threadId);
                if (thread.archived) await thread.setArchived(false);
            } catch { thread = null; userThreads.delete(userId); }
        }
        if (!thread) {
            try {
                thread = await interaction.channel.threads.create({
                    name: `🌱 ${interaction.user.username}`,
                    autoArchiveDuration: 1440,
                    type: ChannelType.PrivateThread,
                    reason: `Farming thread untuk ${interaction.user.username}`
                });
                try { await thread.members.add(userId); } catch {}
                userThreads.set(userId, thread.id);
            } catch (err) {
                try {
                    thread = await interaction.channel.threads.create({
                        name: `🌱 ${interaction.user.username}`,
                        autoArchiveDuration: 1440,
                        type: ChannelType.PublicThread,
                        reason: `Farming thread untuk ${interaction.user.username}`
                    });
                    userThreads.set(userId, thread.id);
                } catch (err2) {
                    return interaction.reply({ content: `❌ Gagal membuat thread: ${err2.message}`, flags: 64 });
                }
            }
        }
        ud.currentView = 'main';
        const msg = await thread.send({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
        activeMessages.set(userId, msg);
        if (ud.autoFarm && !autoFarmIntervals.has(userId)) startAutoFarm(userId);
        return interaction.reply({ content: `✅ Thread farming kamu: ${thread}`, flags: 64 });
    }

    if (id.startsWith('customblock_')) {
        const key = id.replace('customblock_', '');
        if (!SHOP_BLOCKS[key]) return interaction.reply({ content: '❌ Block tidak valid.', flags: 64 });
        return interaction.showModal(buildBuyModal(`Beli ${SHOP_BLOCKS[key].name}`, `modal_buyblock_${key}`));
    }
    if (id.startsWith('customlock_')) {
        const key = id.replace('customlock_', '');
        if (!SHOP_LOCKS[key]) return interaction.reply({ content: '❌ Lock tidak valid.', flags: 64 });
        return interaction.showModal(buildBuyModal(`Beli ${SHOP_LOCKS[key].name}`, `modal_buylock_${key}`));
    }

    if (id === 'nav_main')              ud.currentView = 'main';
    else if (id === 'nav_shop')         ud.currentView = 'shop';
    else if (id === 'nav_shop_tools')   ud.currentView = 'shop_tools';
    else if (id === 'nav_shop_blocks')  ud.currentView = 'shop_blocks';
    else if (id === 'nav_shop_items')   ud.currentView = 'shop_items';
    else if (id === 'nav_shop_locks')   ud.currentView = 'shop_locks';
    else if (id === 'nav_skills')       ud.currentView = 'skills';
    else if (id === 'nav_items')        ud.currentView = 'items';
    else if (id === 'nav_tools')        ud.currentView = 'tools';
    else if (id === 'nav_profile')      ud.currentView = 'profile';
    else if (id === 'nav_event')        ud.currentView = 'event';

    else if (id.startsWith('event_gems_')) {
        const v = parseInt(id.slice(11));
        ud.event.gemsMult = v;
        ud.event.name = (v === 1 && ud.event.blocksMult === 1) ? 'Tidak Ada Event' : `Custom Event (💎 x${v}, 🟫 x${ud.event.blocksMult})`;
        ud.currentView = 'event';
        ephemeralMsg = `✅ Gems & XP Multiplier → **x${v}**`;
    }
    else if (id.startsWith('event_blocks_')) {
        const v = parseInt(id.slice(13));
        ud.event.blocksMult = v;
        ud.event.name = (ud.event.gemsMult === 1 && v === 1) ? 'Tidak Ada Event' : `Custom Event (💎 x${ud.event.gemsMult}, 🟫 x${v})`;
        ud.currentView = 'event';
        ephemeralMsg = `✅ Blocks Multiplier → **x${v}**`;
    }
    else if (id === 'event_reset') {
        ud.event.gemsMult = 1;
        ud.event.blocksMult = 1;
        ud.event.name = 'Tidak Ada Event';
        ud.currentView = 'event';
        ephemeralMsg = '🔄 Event di-reset ke x1.';
    }

    else if (id === 'btn_toggle_auto') {
        ud.autoFarm = !ud.autoFarm;
        if (ud.autoFarm) {
            if (getTotalBlocks(ud) <= 0) {
                ud.autoFarm = false;
                ephemeralMsg = '❌ Semua block habis!';
                ephemeralError = true;
            } else {
                ud.lastBreak = 'Auto Farm aktif!';
                startAutoFarm(userId);
                ephemeralMsg = '▶️ Auto Farm ON!';
            }
        } else {
            ud.lastBreak = 'Auto Farm dimatikan.';
            stopAutoFarm(userId);
            ephemeralMsg = '⏹️ Auto Farm OFF.';
        }
    }

    else if (id === 'btn_farm') {
        if (getTotalBlocks(ud) <= 0) {
            ephemeralMsg = '❌ Semua block habis!';
            ephemeralError = true;
        } else {
            const result = doBreak(ud);
            if (result && !result.switched) ud.lastBreak = formatBreakLog(result, 'Manual');
        }
    }

    else if (id.startsWith('buy_') && SHOP_TOOLS[id.slice(4)]) {
        const key = id.slice(4);
        const t = SHOP_TOOLS[key];
        if (ud.gems < t.price) { ephemeralMsg = `❌ Gems kurang! Butuh ${t.price.toLocaleString()} 💰`; ephemeralError = true; }
        else if (ud.ownedTools.includes(key)) { ephemeralMsg = `❌ Kamu sudah punya **${t.name}**!`; ephemeralError = true; }
        else {
            ud.gems -= t.price;
            ud.ownedTools.push(key);
            ephemeralMsg = `✅ Beli **${t.name}**! (${t.blocksPerBreak} far, x${t.multiplier})\n> 📌 Buka menu **🛠️ Tools** untuk memakainya.`;
        }
    }

    else if (id.startsWith('buyblock_')) {
        const parts = id.split('_');
        const type = parts[1];
        const qty = parseInt(parts[2]);
        const b = SHOP_BLOCKS[type];
        if (!b) { ephemeralMsg = '❌ Block tidak valid.'; ephemeralError = true; }
        else {
            const totalCost = b.price * qty;
            if (ud.gems < totalCost) { ephemeralMsg = `❌ Gems kurang! Butuh ${totalCost.toLocaleString()} 💰`; ephemeralError = true; }
            else {
                ud.gems -= totalCost;
                ud.blocks[type] += qty;
                ephemeralMsg = `✅ Beli **${b.emoji} ${b.name} x${qty}** (-${totalCost.toLocaleString()} 💰)`;
            }
        }
    }

    else if (id.startsWith('buylock_')) {
        const key = id.slice(8);
        const l = SHOP_LOCKS[key];
        if (!l) { ephemeralMsg = '❌ Lock tidak valid.'; ephemeralError = true; }
        else if (ud.gems < l.price) { ephemeralMsg = `❌ Gems kurang! Butuh ${l.price.toLocaleString()} 💰`; ephemeralError = true; }
        else {
            ud.gems -= l.price;
            ud.locks[key] += 1;
            const totalWL = getTotalWL(ud);
            ephemeralMsg = `✅ Beli **${l.emoji} ${l.name}**! (+${l.wlValue.toLocaleString()} WL) → Total **${totalWL.toLocaleString()} WL**`;
        }
    }

    else if (id.startsWith('selectblock_')) {
        const key = id.slice(12);
        if (!SHOP_BLOCKS[key]) { ephemeralMsg = '❌ Block tidak valid.'; ephemeralError = true; }
        else if (ud.blocks[key] <= 0) { ephemeralMsg = `❌ Kamu tidak punya **${SHOP_BLOCKS[key].name}**!`; ephemeralError = true; }
        else { ud.selectedBlock = key; ephemeralMsg = `✅ Sekarang farming **${SHOP_BLOCKS[key].emoji} ${SHOP_BLOCKS[key].name}**!`; }
    }

    else if (id.startsWith('buy_') && SHOP_ITEMS[id.slice(4)]) {
        const key = id.slice(4);
        const i = SHOP_ITEMS[key];
        if (ud.gems < i.price) { ephemeralMsg = `❌ Gems kurang! Butuh ${i.price.toLocaleString()} 💰`; ephemeralError = true; }
        else { ud.gems -= i.price; ud.items[key]++; ephemeralMsg = `✅ Beli **${i.emoji} ${i.name}**!`; }
    }

    else if (id.startsWith('use_')) {
        const key = id.slice(4);
        if (ud.items[key] <= 0) { ephemeralMsg = '❌ Kamu tidak punya item ini.'; ephemeralError = true; }
        else {
            ud.items[key]--;
            ud.activeBuffs[key] = Date.now() + (SHOP_ITEMS[key].duration * 1000);
            ud.currentView = 'main';
            ephemeralMsg = `✅ **${SHOP_ITEMS[key].name}** aktif 5 menit!`;
        }
    }

    else if (id.startsWith('equip_')) {
        const key = id.slice(6);
        if (!ud.ownedTools.includes(key)) { ephemeralMsg = '❌ Kamu tidak punya tool ini.'; ephemeralError = true; }
        else { ud.equippedTool = key; ephemeralMsg = `✅ **${SHOP_TOOLS[key].name}** di-equip! (${SHOP_TOOLS[key].blocksPerBreak} far)`; }
    }
    else if (id === 'unequip_tool') { ud.equippedTool = null; ephemeralMsg = '✅ Tool di-unequip. (1 far)'; }

    else if (id.startsWith('up_')) {
        const key = id.slice(3);
        const s = SKILLS[key];
        const lvl = ud.skills[key];
        if (lvl >= s.maxLevel) { ephemeralMsg = `⚠️ **${s.name}** sudah MAX!`; ephemeralError = true; }
        else if (ud.skillPoints < 1) { ephemeralMsg = `❌ Skill Point tidak cukup! (SP: ${ud.skillPoints})`; ephemeralError = true; }
        else {
            ud.skillPoints -= 1;
            ud.skills[key]++;
            ephemeralMsg = `✅ ${s.emoji} **${s.name}** → Lv.**${ud.skills[key]}/${s.maxLevel}** (Sisa SP: ${ud.skillPoints})`;
        }
    }

    if (!ephemeralError) {
        try {
            await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
            activeMessages.set(userId, interaction.message);
        } catch (err) {}
    }

    if (ephemeralMsg) {
        try {
            if (ephemeralError) await interaction.reply({ content: ephemeralMsg, flags: 64 });
            else await interaction.followUp({ content: ephemeralMsg, flags: 64 });
        } catch (err) {}
    }

    refreshLeaderboard();
});

client.login(process.env.DISCORD_TOKEN);