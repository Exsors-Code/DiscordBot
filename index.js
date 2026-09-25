require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    PermissionFlagsBits
} = require('discord.js');
const db = require('./database');
const { handleAdminInteraction, handleMemberJoin } = require('./admin');
const utility = require('./utility');
const { checkOwnerOnly, blockNonOwner } = require('./owner');
const updateMod = require('./update');
const voiceMod = require('./voice');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ] 
});

// ==========================================
// 🛡️ GLOBAL ERROR HANDLER
// ==========================================
process.on('unhandledRejection', (error) => {
    if (error?.code === 10062) console.log('⚠️ [10062] Interaction expired');
    else if (error?.code === 40060) console.log('⚠️ [40060] Already acknowledged');
    else console.error('❌ Unhandled Rejection:', error);
});
process.on('uncaughtException', (error) => {
    if (error?.code === 10062) console.log('⚠️ [10062] Interaction expired');
    else if (error?.code === 40060) console.log('⚠️ [40060] Already acknowledged');
    else console.error('❌ Uncaught Exception:', error);
});

// ==========================================
// 🎨 EMOJI CONFIG
// ==========================================
const EMOJI = {
    lray:     '<:lray:1552901313992335390>',
    ancesred: '<:ancesred:1552900692895600640>',
    bgl:      '<:bgl:1552900717780406303>',
    black:    '<:black:1552900737221263500>',
    dirt:     '<:dirt:1552900796763602985>',
    dl:       '<:dl:1552900827130372168>',
    fist:     '<:fist:1552900846725898282>',
    gang:     '<:gang:1552900891651215430>',
    gbc:      '<:gbc:1552901254177497179>',
    gems:     '<:gems:1552901284443455528>',
    pog:      '<:pog:1552901365704032256>',
    mray:     '<:mray:1552901340005670932>',
    rayman:   '<:rayman:1552901389120704623>',
    wl:       '<:wl:1552901434834550824>',
    gray:     '<:gray:1552905480815378552>',
    sand:     '🟨',
    gravel:   '🪨',
    grass:    '🌿',
    clay:     '🧱',
    stone:    '⬜',
    iron:     '⚙️',
    gold:     '🟡',
    emerald:  '💚',
    diamond:  '💎',
    ruby:     '🔴',
    sapphire: '🔵',
    netherite:'⬛',
    obsidian: '🟣',
    bedrock:  '🔲',
    lss:      '🗡️'
};

// ==========================================
// ⚙️ KONFIGURASI
// ==========================================
const LEADERBOARD_UPDATE_INTERVAL = 10000;
const EVENT_ROLE_IDS = ['1408101505008926840'];
const EDIT_THROTTLE_MS = 3000;
const INTERACTION_LOCK_MS = 1500;
const MEMBER_CACHE_TTL = 5 * 60 * 1000;

const WL_TO_GEMS = 2000; // 1 WL = 2.000 gems

const actionLocks = new Set();
function lockUser(userId, ms = 1500) {
    if (actionLocks.has(userId)) return false;
    actionLocks.add(userId);
    setTimeout(() => actionLocks.delete(userId), ms);
    return true;
}

const UNLIMITED_BLOCKS = ['dirt'];
function isUnlimited(k) { return UNLIMITED_BLOCKS.includes(k); }

const BASE_AUTO_INTERVAL = 5000;
const AUTO_INTERVAL_REDUCTION = 200;
const MIN_AUTO_INTERVAL = 3000;

const TIMEWARP_REDUCTION = 0.5;
const TIMEWARP_DURATION = 60;

function getAutoInterval(ud) {
    let interval = Math.max(MIN_AUTO_INTERVAL, BASE_AUTO_INTERVAL - ud.skills.mining_speed * AUTO_INTERVAL_REDUCTION);
    if (isBuffActive(ud, 'timewarp')) {
        interval = Math.max(500, Math.floor(interval * TIMEWARP_REDUCTION));
    }
    return interval;
}

// ===== FORMULA XP LEVEL (×5 lebih susah) =====
function getMaxXpForLevel(L) {
    const base = (17*L*L*L + 2433*L*L + 6328*L - 1908) / 3;
    return Math.max(1, Math.floor(base * 5));
}

function getSkillUpgradeCost(lvl) { return Math.min(5, 1 + Math.floor(lvl / 2)); }

// ==========================================
// 🛠️ TOOLS
// ==========================================
const SHOP_TOOLS = {
    lss:  { name: 'LSS',  price: 10000,    multiplier: 30,  blocksPerBreak: 3,  emoji: EMOJI.lss },
    lray: { name: 'LRAY', price: 100000,   multiplier: 50,  blocksPerBreak: 7,  emoji: EMOJI.lray },
    mray: { name: 'MRAY', price: 1000000,  multiplier: 100, blocksPerBreak: 10, emoji: EMOJI.mray },
    gray: { name: 'GRAY', price: 10000000, multiplier: 250, blocksPerBreak: 15, emoji: EMOJI.gray }
};

// ==========================================
// 🪨 BLOCKS — harga pakai WL
// ==========================================
// Low tier (di bawah POG)
const BLOCKS_LOW = {
    dirt:   { name: 'Dirt',   priceWL: 0,     gemsMin: 1,      gemsMax: 5,       xpMin: 1,       xpMax: 5,       emoji: EMOJI.dirt, unlimited: true },
    sand:   { name: 'Sand',   priceWL: 0.05,  gemsMin: 105,    gemsMax: 110,     xpMin: 21,      xpMax: 22,      emoji: EMOJI.sand },
    gravel: { name: 'Gravel', priceWL: 0.1,   gemsMin: 210,    gemsMax: 220,     xpMin: 42,      xpMax: 44,      emoji: EMOJI.gravel },
    grass:  { name: 'Grass',  priceWL: 0.25,  gemsMin: 525,    gemsMax: 550,     xpMin: 105,     xpMax: 110,     emoji: EMOJI.grass },
    clay:   { name: 'Clay',   priceWL: 0.4,   gemsMin: 840,    gemsMax: 880,     xpMin: 168,     xpMax: 176,     emoji: EMOJI.clay },
    stone:  { name: 'Stone',  priceWL: 0.5,   gemsMin: 1050,   gemsMax: 1100,    xpMin: 210,     xpMax: 220,     emoji: EMOJI.stone },
    iron:   { name: 'Iron',   priceWL: 0.75,  gemsMin: 1575,   gemsMax: 1650,    xpMin: 315,     xpMax: 330,     emoji: EMOJI.iron },
    gold:   { name: 'Gold',   priceWL: 1,     gemsMin: 2100,   gemsMax: 2200,    xpMin: 420,     xpMax: 440,     emoji: EMOJI.gold }
};

// POG (1 WL per block)
const BLOCK_POG = {
    pog: { name: "Pot O' Gems", priceWL: 2, gemsMin: 4200, gemsMax: 4400, xpMin: 840, xpMax: 880, emoji: EMOJI.pog }
};

// High tier (di atas POG)
const BLOCKS_HIGH = {
    emerald:   { name: 'Emerald',   priceWL: 5,    gemsMin: 10500,   gemsMax: 11000,   xpMin: 2100,   xpMax: 2200,   emoji: EMOJI.emerald },
    diamond:   { name: 'Diamond',   priceWL: 10,   gemsMin: 21000,   gemsMax: 22000,   xpMin: 4200,   xpMax: 4400,   emoji: EMOJI.diamond },
    ruby:      { name: 'Ruby',      priceWL: 25,   gemsMin: 52500,   gemsMax: 55000,   xpMin: 10500,  xpMax: 11000,  emoji: EMOJI.ruby },
    sapphire:  { name: 'Sapphire',  priceWL: 50,   gemsMin: 105000,  gemsMax: 110000,  xpMin: 21000,  xpMax: 22000,  emoji: EMOJI.sapphire },
    netherite: { name: 'Netherite', priceWL: 100,  gemsMin: 210000,  gemsMax: 220000,  xpMin: 42000,  xpMax: 44000,  emoji: EMOJI.netherite },
    obsidian:  { name: 'Obsidian',  priceWL: 250,  gemsMin: 525000,  gemsMax: 550000,  xpMin: 105000, xpMax: 110000, emoji: EMOJI.obsidian },
    bedrock:   { name: 'Bedrock',   priceWL: 500,  gemsMin: 1050000, gemsMax: 1100000, xpMin: 210000, xpMax: 220000, emoji: EMOJI.bedrock }
};

const SHOP_BLOCKS = { ...BLOCKS_LOW, ...BLOCK_POG, ...BLOCKS_HIGH };

// ==========================================
// 🎁 ITEMS
// ==========================================
const SHOP_ITEMS = {
    arroz: { name: 'Arroz Con Pollo', price: 50000, emoji: '🍗', category: 'buff', duration: 300, desc: 'x2 Gems selama 5 menit' },
    clover: { name: 'Lucky Clover', price: 250000, emoji: '🍀', category: 'buff', duration: 300, desc: 'x2 XP selama 5 menit' },
    gempack: { name: 'Gem Pack', price: 100000, emoji: '💎', category: 'instant', effect: 'gems', amount: 150000, desc: 'Buka untuk dapat +150.000 Gems instant' },
    xpscroll: { name: 'XP Scroll', price: 150000, emoji: '📜', category: 'instant', effect: 'xp', amount: 50000, desc: 'Buka untuk dapat +50.000 XP instant' },
    bomb: { name: 'Block Bomb', price: 25000, emoji: '💣', category: 'instant', effect: 'blocks', amount: 100, desc: "Meledakkan 100 Pot O' Gems ke inventory" },
    timewarp: { name: 'Time Warp', price: 500000, emoji: '⏳', category: 'buff', duration: TIMEWARP_DURATION, desc: 'Auto Farm 2x lebih cepat selama 60 detik' },
    gbc: { name: 'GBC (Gacha Box Crystal)', price: 50000, emoji: EMOJI.gbc, category: 'gacha', desc: 'Tiket gacha — pakai di menu 🎰 Gacha' }
};

// ==========================================
// 🔴 ANCES RED
// ==========================================
const ANCES_RED = {
    name: 'Ances Red',
    emoji: EMOJI.ancesred,
    maxLevel: 6,
    bonuses: [0, 5, 10, 15, 20, 25, 35],
    costs: [
        { gems: 500000,   bgl: 0 },
        { gems: 2000000,  bgl: 0 },
        { gems: 10000000, bgl: 0 },
        { gems: 50000000, bgl: 0 },
        { gems: 0,        bgl: 1 },
        { gems: 0,        bgl: 5 }
    ]
};

// ==========================================
// 🎰 GACHA
// ==========================================
const GACHA_CONFIG = {
    gangGlobalSupply: 100,
    prizes: [
        { key: 'gems_50k',   type: 'gems',     amount: 50000,   chance: 20, label: '50.000 Gems' },
        { key: 'xp_25k',     type: 'xp',       amount: 25000,   chance: 15, label: '25.000 XP' },
        { key: 'gbc_1',      type: 'gbc',      amount: 1,       chance: 12, label: '1 GBC (roll lagi!)' },
        { key: 'bomb_5',     type: 'bomb',     amount: 5,       chance: 8,  label: '5× Block Bomb' },
        { key: 'arroz_3',    type: 'arroz',    amount: 3,       chance: 8,  label: '3× Arroz' },
        { key: 'clover_2',   type: 'clover',   amount: 2,       chance: 7,  label: '2× Clover' },
        { key: 'gempack_2',  type: 'gempack',  amount: 2,       chance: 5,  label: '2× Gem Pack' },
        { key: 'xpscroll_1', type: 'xpscroll', amount: 1,       chance: 5,  label: '1× XP Scroll' },
        { key: 'timewarp_1', type: 'timewarp', amount: 1,       chance: 5,  label: '1× Time Warp' },
        { key: 'gems_500k',  type: 'gems',     amount: 500000,  chance: 5,  label: '500.000 Gems!' },
        { key: 'ancesred_1', type: 'ancesred', amount: 1,       chance: 3,  label: '🔴 1× Ances Red!' },
        { key: 'gems_2m',    type: 'gems',     amount: 2000000, chance: 2,  label: '2.000.000 Gems!!' },
        { key: 'gang_1',     type: 'gang',     amount: 1,       chance: 5,  label: '🎉 GANG! (limited)' }
    ]
};

const GANG = {
    name: 'Gang',
    emoji: EMOJI.gang,
    maxCount: 6,
    bonusPerGang: 5
};

// ==========================================
// 🔒 LOCKS
// ==========================================
const SHOP_LOCKS = {
    wl:  { name: 'WL',  emoji: EMOJI.wl,  price: 2000 },
    dl:  { name: 'DL',  emoji: EMOJI.dl,  price: 200000 },
    bgl: { name: 'BGL', emoji: EMOJI.bgl, price: 20000000 }
};

const SKILLS = {
    mining_speed:     { name: 'Mining Speed',     emoji: '⛏️', maxLevel: 10 },
    gem_hunter:       { name: 'Gem Hunter',       emoji: '💎', maxLevel: 10 },
    lucky_find:       { name: 'Lucky Find',       emoji: '🍀', maxLevel: 10 },
    xp_boost:         { name: 'XP Boost',         emoji: '📈', maxLevel: 10 },
    inventory_master: { name: 'Inventory Master', emoji: '📦', maxLevel: 10 }
};

const BASE_RETURN_CHANCE = 0.10;
const MAX_CUSTOM_QTY = 1000000;

// ==========================================
// CACHE
// ==========================================
const autoFarmIntervals = new Map();
const autoFarmTokens = new Map();
const activeMessages = new Map();
const userThreads = new Map();
const userCache = new Map();
const guildLeaderboards = new Map();
const guildMemberCache = new Map();
const guildMemberCacheTime = new Map();
const userLastInteraction = new Map();
const userLastEdit = new Map();
const afkCheckTimers = new Map();

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function getTotalBlocks(ud) {
    let total = 0;
    for (const k in SHOP_BLOCKS) total += (ud.blocks[k] || 0);
    return total;
}
function getTotalLockValue(ud) {
    return (ud.locks.wl * 1) + (ud.locks.dl * 100) + (ud.locks.bgl * 10000) + (ud.locks.bglb * 1000000);
}
function isBuffActive(ud, key) { return Date.now() < ud.activeBuffs[key]; }

function getGemMultiplier(ud) {
    const ancesLevel = ud.items.ancesRedLevel || 0;
    const ancesBonus = ANCES_RED.bonuses[ancesLevel] || 0;
    const gangCount = ud.items.gang || 0;
    const gangBonus = Math.min(gangCount, GANG.maxCount) * GANG.bonusPerGang;
    return 1 + ((ancesBonus + gangBonus) / 100);
}

function getActiveBuffText(ud) {
    const a = [];
    if (isBuffActive(ud, 'arroz')) a.push(`🍗 Arroz • ${Math.ceil((ud.activeBuffs.arroz - Date.now())/1000)}s`);
    if (isBuffActive(ud, 'clover')) a.push(`🍀 Clover • ${Math.ceil((ud.activeBuffs.clover - Date.now())/1000)}s`);
    if (isBuffActive(ud, 'timewarp')) a.push(`⏳ Time Warp • ${Math.ceil((ud.activeBuffs.timewarp - Date.now())/1000)}s`);
    return a.length ? a.join(' | ') : '*(Tidak ada)*';
}

function checkLevelUp(ud) {
    let n = 0;
    ud.maxXp = getMaxXpForLevel(ud.level);
    while (ud.xp >= ud.maxXp) {
        ud.xp -= ud.maxXp;
        ud.level++;
        ud.skillPoints++;
        ud.maxXp = getMaxXpForLevel(ud.level);
        n++;
    }
    return n;
}

function isEventManager(member) {
    if (!member) return false;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    return EVENT_ROLE_IDS.some(id => member.roles.cache.has(id));
}

async function getGuildMemberIds(guildId) {
    const now = Date.now();
    const last = guildMemberCacheTime.get(guildId) || 0;
    if (now - last > MEMBER_CACHE_TTL || !guildMemberCache.has(guildId)) {
        try {
            const g = client.guilds.cache.get(guildId);
            if (g) {
                const m = await g.members.fetch();
                guildMemberCache.set(guildId, new Set(m.keys()));
                guildMemberCacheTime.set(guildId, now);
            }
        } catch (e) {}
    }
    return guildMemberCache.get(guildId) || new Set();
}

function loadUser(userId, username) {
    const ud = db.getUser(userId, username);
    ud.maxXp = getMaxXpForLevel(ud.level);
    for (const k in SHOP_BLOCKS) {
        if (ud.blocks[k] === undefined) ud.blocks[k] = 0;
    }
    if (!ud.items.gempack) ud.items.gempack = 0;
    if (!ud.items.xpscroll) ud.items.xpscroll = 0;
    if (!ud.items.bomb) ud.items.bomb = 0;
    if (!ud.items.timewarp) ud.items.timewarp = 0;
    if (!ud.items.gbc) ud.items.gbc = 0;
    if (!ud.items.gang) ud.items.gang = 0;
    if (ud.items.ancesRedLevel === undefined) ud.items.ancesRedLevel = 0;
    if (!ud.activeBuffs.timewarp) ud.activeBuffs.timewarp = 0;
    return ud;
}

function formatWL(v) {
    if (v === 0) return '0';
    if (v < 1) return v.toFixed(2);
    if (v === Math.floor(v)) return v.toLocaleString();
    return v.toFixed(2);
}

function formatStock(k, a) {
    return isUnlimited(k) ? '**∞ (Unlimited)**' : `**${a.toLocaleString()}**`;
}

// ==========================================
// 🎨 MAIN PANEL EMBED
// ==========================================
function mainEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const sel = SHOP_BLOCKS[ud.selectedBlock] || SHOP_BLOCKS.dirt;
    const interval = getAutoInterval(ud);
    const ev = ud.event;

    const xpPercent = ud.maxXp > 0 ? ud.xp / ud.maxXp : 0;
    const barLength = 15;
    const filled = Math.round(xpPercent * barLength);
    const xpBar = '█'.repeat(Math.min(filled, barLength)) + '░'.repeat(Math.max(barLength - filled, 0));

    const autoIcon = ud.autoFarm ? '▶️' : '⏸️';
    const twActive = isBuffActive(ud, 'timewarp');
    const autoText = ud.autoFarm ? `**ON** · (interval/1000).toFixed(1)s{twActive ? ' ⚡' : ''}` : '**OFF**';
    const statusIcon = ud.autoFarm ? '🟢' : '⚪';

    const buffs = [];
    if (isBuffActive(ud, 'arroz')) buffs.push(`🍗 Arroz · ${Math.ceil((ud.activeBuffs.arroz - Date.now()) / 1000)}s`);
    if (isBuffActive(ud, 'clover')) buffs.push(`🍀 Clover · ${Math.ceil((ud.activeBuffs.clover - Date.now()) / 1000)}s`);
    if (isBuffActive(ud, 'timewarp')) buffs.push(`⏳ Time Warp · ${Math.ceil((ud.activeBuffs.timewarp - Date.now()) / 1000)}s ⚡`);
    const buffText = buffs.length ? buffs.join('  ·  ') : '*Tidak ada buff aktif*';

    const toolText = tool
        ? `tool.emoji**{tool.name}** x${tool.multiplier}  ·  ${tool.blocksPerBreak} far`
        : '⚪ **Tidak ada** · 1 far';

    const stockText = isUnlimited(ud.selectedBlock)
        ? '∞'
        : (ud.blocks[ud.selectedBlock] || 0).toLocaleString();

    const ancesLevel = ud.items.ancesRedLevel || 0;
    const gangCount = ud.items.gang || 0;
    const totalBoost = getGemMultiplier(ud);
    const boostPercent = Math.round((totalBoost - 1) * 100);

    return new EmbedBuilder()
        .setColor(ud.autoFarm ? '#57F287' : '#2b2d31')
        .setAuthor({ name: `🌾 Farming Panel — ${ud.username}` })
        .setDescription(
            `**Level ud.level** · ⭐**{ud.skillPoints} SP**\n` +
            `\`${xpBar}\`  **${Math.floor(xpPercent * 100)}%**\n` +
            `📈 ${ud.xp.toLocaleString()} / ${ud.maxXp.toLocaleString()} XP`
        )
        .addFields(
            {
                name: '📊  Status',
                value:
                    `🎉 **Event**  ·  ${ev.name}\n` +
                    `💰 **Gems**  ·  ${Math.floor(ud.gems).toLocaleString()}\n` +
                    `${EMOJI.wl} **WL**  ·  ${formatWL(ud.locks.wl)}\n` +
                    `⛏️ **Mining**  ·  ${sel.emoji} sel.name({stockText})`,
                inline: false
            },
            {
                name: '💎  Booster',
                value:
                    `ANCESRED.emoji**AncesRed** · Lv.{ancesLevel}/${ANCES_RED.maxLevel}\n` +
                    `${GANG.emoji} **Gang**  ·  gangCount/{GANG.maxCount}\n` +
                    `✨ **Total Boost**  ·  **+${boostPercent}%** Gems`,
                inline: false
            },
            {
                name: '🛠️  Tool & Buff',
                value:
                    `⚔️ ${toolText}\n` +
                    `✨ ${buffText}`,
                inline: false
            },
            {
                name: `${statusIcon}  Auto Farm`,
                value:
                    `${autoIcon} ${autoText}\n` +
                    `📝 *${ud.lastBreak}*`,
                inline: false
            }
        )
        .setFooter({ text: 'GrowExs Farming · Tekan tombol di bawah untuk mulai' })
        .setTimestamp();
}

// ==========================================
// 🎨 MAIN BUTTONS
// ==========================================
function mainButtons(ud) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_farm').setLabel('Farm Manual').setEmoji('🌾').setStyle(ButtonStyle.Success).setDisabled(ud.autoFarm),
        new ButtonBuilder().setCustomId('btn_toggle_auto').setLabel(ud.autoFarm ? 'Stop Auto' : 'Start Auto').setEmoji(ud.autoFarm ? '⏹️' : '▶️').setStyle(ud.autoFarm ? ButtonStyle.Danger : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_change_block').setLabel('Ganti Block').setEmoji('⛏️').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('main_menu_select')
            .setPlaceholder('📋  Buka menu lainnya...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Shop').setDescription('Beli tools, blocks, items, dan locks').setValue('menu_shop').setEmoji('🛒'),
                new StringSelectMenuOptionBuilder().setLabel('Items').setDescription('Pakai buff & item instant').setValue('menu_items').setEmoji('🎒'),
                new StringSelectMenuOptionBuilder().setLabel('Gacha').setDescription('Roll gacha pakai GBC — hadiah langka!').setValue('menu_gacha').setEmoji('🎰'),
                new StringSelectMenuOptionBuilder().setLabel('Profile').setDescription('Lihat statistik lengkap kamu').setValue('menu_profile').setEmoji('👤'),
                new StringSelectMenuOptionBuilder().setLabel('Skills').setDescription('Upgrade skill pakai SP').setValue('menu_skills').setEmoji('⭐'),
                new StringSelectMenuOptionBuilder().setLabel('Tools').setDescription('Equip / ganti tool aktif').setValue('menu_tools').setEmoji('🛠️')
            )
    );
    return [row1, row2];
}

// ==========================================
// EVENT
// ==========================================
function eventEmbed(ud) {
    const ev = ud.event;
    return new EmbedBuilder().setColor('#E91E63').setTitle('🎉 Event Aktif')
        .setDescription(`### **${ev.name}**\n\n> 💰 **Gems Multiplier**: **x${ev.gemsMult}**\n> 🪨 **Blocks Multiplier**: **x${ev.blocksMult}**\n> 📈 XP juga kena multiplier Gems\n\n*Gunakan \`/customevent\` untuk mengubah.*`);
}
function eventButtons() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
}

// ==========================================
// SHOP
// ==========================================
function shopMainEmbed(ud) {
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop').setDescription('Pilih kategori:')
        .addFields(
            { name: '🛠️ Tools', value: 'Tool boost farming', inline: true },
            { name: '🪨 Blocks', value: 'Beli block pakai WL', inline: true },
            { name: '🎒 Items', value: 'Buff, instant & gacha ticket', inline: true },
            { name: '🔒 Locks', value: 'Beli lock', inline: true }
        ).setFooter({ text: `Gems: ${Math.floor(ud.gems).toLocaleString()} • WL: ${formatWL(ud.locks.wl)}` });
}
function shopMainButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop_tools').setLabel('🛠️ Tools').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_shop_blocks').setLabel('🪨 Blocks').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_shop_items').setLabel('🎒 Items').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_shop_locks').setLabel('🔒 Locks').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopToolsEmbed(ud) {
    const l = [`**${EMOJI.fist} TOOLS**`];
    for (const k in SHOP_TOOLS) {
        const t = SHOP_TOOLS[k];
        const o = ud.ownedTools.includes(k) ? ' ✅' : '';
        l.push(`t.emoji**{t.name}**${o} — ${t.price.toLocaleString()} ${EMOJI.gems}\n> x${t.multiplier} Gems | ⛏️ **${t.blocksPerBreak} far**`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — Tools')
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopToolsButtons() {
    const rows = [];
    const keys = Object.keys(SHOP_TOOLS);
    for (let i = 0; i < keys.length; i += 4) {
        const row = new ActionRowBuilder();
        for (let j = i; j < Math.min(i + 4, keys.length); j++) {
            row.addComponents(new ButtonBuilder().setCustomId(`buy_${keys[j]}`).setLabel(SHOP_TOOLS[keys[j]].name).setStyle(ButtonStyle.Success));
        }
        rows.push(row);
    }
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
}

// ==========================================
// SHOP BLOCKS — pakai WL
// ==========================================
function shopBlocksEmbed(ud, page = 'low') {
    const l = [];
    let title = '🛒 Shop — Blocks';

    if (page === 'low') {
        title = '🛒 Shop — Blocks (Low Tier)';
        l.push(`**🪨 BLOCK MURAH** *(pakai WL, profit ~5-10%)*`, '');
        for (const k in BLOCKS_LOW) {
            const b = BLOCKS_LOW[k];
            const priceLabel = b.unlimited ? '**∞ (Unlimited)**' : `${formatWL(b.priceWL)} ${EMOJI.wl}`;
            const gemsEq = b.unlimited ? 0 : Math.floor(b.priceWL * WL_TO_GEMS);
            l.push(`b.emoji**{b.name}** — priceLabel{gemsEq ? ` *(~${gemsEq.toLocaleString()} gems)*` : ''}\n> Reward: **${b.gemsMin.toLocaleString()}-b.gemsMax.toLocaleString()**Gems|**{b.xpMin}-${b.xpMax} XP**\n> 📦 Stok: ${formatStock(k, ud.blocks[k] || 0)}`);
        }
    }
    else if (page === 'pog') {
        title = '🛒 Shop — Blocks (POG)';
        l.push(`**${EMOJI.pog} POT O' GEMS** *(mid tier)*`, '');
        for (const k in BLOCK_POG) {
            const b = BLOCK_POG[k];
            const gemsEq = Math.floor(b.priceWL * WL_TO_GEMS);
            l.push(`b.emoji**{b.name}** — ${formatWL(b.priceWL)} EMOJI.wl*(~{gemsEq.toLocaleString()} gems)*\n> Reward: **b.gemsMin.toLocaleString()-{b.gemsMax.toLocaleString()}** Gems | **b.xpMin-{b.xpMax} XP**\n> 📦 Stok: ${formatStock(k, ud.blocks[k] || 0)}`);
        }
    }
    else {
        title = '🛒 Shop — Blocks (High Tier)';
        l.push(`**💎 BLOCK MAHAL** *(pakai WL, profit ~5-10%)*`, '');
        for (const k in BLOCKS_HIGH) {
            const b = BLOCKS_HIGH[k];
            const gemsEq = Math.floor(b.priceWL * WL_TO_GEMS);
            l.push(`b.emoji**{b.name}** — ${formatWL(b.priceWL)} EMOJI.wl*(~{gemsEq.toLocaleString()} gems)*\n> Reward: **b.gemsMin.toLocaleString()-{b.gemsMax.toLocaleString()}** Gems | **b.xpMin-{b.xpMax} XP**\n> 📦 Stok: ${formatStock(k, ud.blocks[k] || 0)}`);
        }
    }

    return new EmbedBuilder().setColor('#8B4513').setTitle(title)
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `${EMOJI.wl} WL kamu: ${formatWL(ud.locks.wl)} • Page: ${page}` });
}

function shopBlocksButtons(ud, page = 'low') {
    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_blocks_page_low').setLabel('🪨 Low').setStyle(page === 'low' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(page === 'low'),
        new ButtonBuilder().setCustomId('shop_blocks_page_pog').setLabel('🥔 POG').setStyle(page === 'pog' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(page === 'pog'),
        new ButtonBuilder().setCustomId('shop_blocks_page_high').setLabel('💎 High').setStyle(page === 'high' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(page === 'high')
    );

    const currentBlocks = page === 'low' ? BLOCKS_LOW : (page === 'pog' ? BLOCK_POG : BLOCKS_HIGH);
    const buyRow1 = new ActionRowBuilder();
    const buyRow2 = new ActionRowBuilder();
    let count = 0;

    for (const k in currentBlocks) {
        const b = currentBlocks[k];
        if (b.unlimited) continue;
        const btn = new ButtonBuilder().setCustomId(`customblock_${k}`).setLabel(`Beli ${b.name}`).setStyle(ButtonStyle.Primary);
        if (count < 5) buyRow1.addComponents(btn);
        else buyRow2.addComponents(btn);
        count++;
    }

    const rows = [navRow];
    if (buyRow1.components.length > 0) rows.push(buyRow1);
    if (buyRow2.components.length > 0) rows.push(buyRow2);
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
}

// ==========================================
// CHANGE BLOCK — paginated
// ==========================================
function changeBlockEmbed(ud, page = 'low') {
    const l = [];
    let title = '⛏️ Ganti Block Aktif';

    if (page === 'low') {
        title = '⛏️ Ganti Block — Low Tier';
        for (const k in BLOCKS_LOW) {
            const b = BLOCKS_LOW[k];
            const s = ud.selectedBlock === k ? ' **[AKTIF]**' : '';
            l.push(`b.emoji**{b.name}**${s}\n> Reward: **${b.gemsMin.toLocaleString()}-${b.gemsMax.toLocaleString()}** Gems\n> Stok: ${formatStock(k, ud.blocks[k] || 0)}`);
        }
    } else if (page === 'pog') {
        title = '⛏️ Ganti Block — POG';
        for (const k in BLOCK_POG) {
            const b = BLOCK_POG[k];
            const s = ud.selectedBlock === k ? ' **[AKTIF]**' : '';
            l.push(`b.emoji**{b.name}**${s}\n> Reward: **${b.gemsMin.toLocaleString()}-${b.gemsMax.toLocaleString()}** Gems\n> Stok: ${formatStock(k, ud.blocks[k] || 0)}`);
        }
    } else {
        title = '⛏️ Ganti Block — High Tier';
        for (const k in BLOCKS_HIGH) {
            const b = BLOCKS_HIGH[k];
            const s = ud.selectedBlock === k ? ' **[AKTIF]**' : '';
            l.push(`b.emoji**{b.name}**${s}\n> Reward: **${b.gemsMin.toLocaleString()}-${b.gemsMax.toLocaleString()}** Gems\n> Stok: ${formatStock(k, ud.blocks[k] || 0)}`);
        }
    }

    return new EmbedBuilder().setColor('#8B4513').setTitle(title).setDescription(l.join('\n\n'))
        .setFooter({ text: `Page: ${page}` });
}

function changeBlockButtons(ud, page = 'low') {
    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('change_block_page_low').setLabel('🪨 Low').setStyle(page === 'low' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(page === 'low'),
        new ButtonBuilder().setCustomId('change_block_page_pog').setLabel('🥔 POG').setStyle(page === 'pog' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(page === 'pog'),
        new ButtonBuilder().setCustomId('change_block_page_high').setLabel('💎 High').setStyle(page === 'high' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(page === 'high')
    );

    const currentBlocks = page === 'low' ? BLOCKS_LOW : (page === 'pog' ? BLOCK_POG : BLOCKS_HIGH);
    const selectRow1 = new ActionRowBuilder();
    const selectRow2 = new ActionRowBuilder();
    let count = 0;

    for (const k in currentBlocks) {
        const b = currentBlocks[k];
        const stock = isUnlimited(k) ? '∞' : (ud.blocks[k] || 0).toLocaleString();
        const isSelected = ud.selectedBlock === k;
        const isDisabled = isSelected || (!isUnlimited(k) && (ud.blocks[k] || 0) <= 0);
        const btn = new ButtonBuilder().setCustomId(`selectblock_k`).setLabel(`{b.name} (${stock})`).setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Primary).setDisabled(isDisabled);
        if (count < 5) selectRow1.addComponents(btn);
        else selectRow2.addComponents(btn);
        count++;
    }

    const rows = [navRow];
    if (selectRow1.components.length > 0) rows.push(selectRow1);
    if (selectRow2.components.length > 0) rows.push(selectRow2);
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
}

// ==========================================
// SHOP ITEMS
// ==========================================
function shopItemsEmbed(ud) {
    const buffs = [], instant = [], gacha = [];
    for (const k in SHOP_ITEMS) {
        const i = SHOP_ITEMS[k];
        const line = `i.emoji**{i.name}** — ${i.price.toLocaleString()} ${EMOJI.gems}\n> ${i.desc}\n> 📦 Dimiliki: **${ud.items[k] || 0}**`;
        if (i.category === 'buff') buffs.push(line);
        else if (i.category === 'gacha') gacha.push(line);
        else instant.push(line);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — Items')
        .setDescription(`**✨ BUFF ITEM**\n\n${buffs.join('\n\n')}\n\n**⚡ INSTANT ITEM**\n\n${instant.join('\n\n')}\n\n**🎰 GACHA ITEM**\n\n${gacha.join('\n\n')}`)
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopItemsButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_arroz').setLabel('🍗 Beli Arroz').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_clover').setLabel('🍀 Beli Clover').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_timewarp').setLabel('⏳ Beli Time Warp').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_gempack').setLabel('💎 Beli Gem Pack').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('buy_xpscroll').setLabel('📜 Beli XP Scroll').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('buy_bomb').setLabel('💣 Beli Block Bomb').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_gbc').setLabel('Beli GBC (Gacha Ticket)').setEmoji(EMOJI.gbc).setStyle(ButtonStyle.Danger)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopLocksEmbed(ud) {
    const l = ['**BELI LOCK**', ''];
    for (const k in SHOP_LOCKS) {
        const x = SHOP_LOCKS[k];
        l.push(`x.emoji**{x.name}** — ${x.price.toLocaleString()} ${EMOJI.gems}/lock\n> 📦 Kamu punya: **${formatWL(ud.locks[k])}**`);
    }
    l.push(`\n**Auto-convert:** 100 ${EMOJI.wl} → 1 ${EMOJI.dl} → 1 ${EMOJI.bgl} → 1 ${EMOJI.black}`);
    return new EmbedBuilder().setColor('#F1C40F').setTitle('🛒 Shop — Locks')
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopLocksButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('customlock_wl').setLabel('Beli WL').setEmoji(EMOJI.wl).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customlock_dl').setLabel('Beli DL').setEmoji(EMOJI.dl).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customlock_bgl').setLabel('Beli BGL').setEmoji(EMOJI.bgl).setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

// ==========================================
// SKILLS
// ==========================================
function skillsEmbed(ud) {
    const total = Object.values(ud.skills).reduce((a,b)=>a+b,0);
    const max = Object.values(SKILLS).reduce((a,b)=>a+b.maxLevel,0);
    const ci = (getAutoInterval(ud) / 1000).toFixed(1);
    const nx = getMaxXpForLevel(ud.level);
    return new EmbedBuilder().setColor('#9B59B6').setTitle('⭐ Skills')
        .setDescription(
            `### ⭐ Skill Points: **${ud.skillPoints}** SP\n` +
            `> Total Skill: **${total} / ${max}**\n` +
            `> ⏱️ Auto Farm: **${ci}s**\n` +
            `> 📈 XP Next: **${nx.toLocaleString()}**\n\n` +
            Object.entries(SKILLS).map(([k, s]) => {
                const lvl = ud.skills[k];
                const isMax = lvl >= s.maxLevel;
                const cost = getSkillUpgradeCost(lvl);
                return `s.emoji**{s.name}** — ${isMax ? '**MAX** ✅' : `Lv. lvl/{s.maxLevel} • **${cost} SP**`}`;
            }).join('\n')
        )
        .setFooter({ text: `Level: ${ud.level} • SP: ${ud.skillPoints}` });
}
function skillsButtons(ud) {
    const dis = (k) => {
        const lvl = ud.skills[k];
        if (lvl >= SKILLS[k].maxLevel) return true;
        return ud.skillPoints < getSkillUpgradeCost(lvl);
    };
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('up_mining_speed').setLabel('⛏️ Mining').setStyle(ButtonStyle.Success).setDisabled(dis('mining_speed')),
            new ButtonBuilder().setCustomId('up_gem_hunter').setLabel('💎 Gem Hunter').setStyle(ButtonStyle.Success).setDisabled(dis('gem_hunter')),
            new ButtonBuilder().setCustomId('up_lucky_find').setLabel('🍀 Lucky').setStyle(ButtonStyle.Success).setDisabled(dis('lucky_find'))
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('up_xp_boost').setLabel('📈 XP Boost').setStyle(ButtonStyle.Success).setDisabled(dis('xp_boost')),
            new ButtonBuilder().setCustomId('up_inventory_master').setLabel('📦 Inv Master').setStyle(ButtonStyle.Success).setDisabled(dis('inventory_master')),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

// ==========================================
// ITEMS (INVENTORY)
// ==========================================
function itemsEmbed(ud) {
    const buffs = [];
    if (ud.items.arroz > 0) buffs.push(`🍗 **Arroz Con Pollo** ×${ud.items.arroz}\n> x2 Gems selama 5 menit`);
    if (ud.items.clover > 0) buffs.push(`🍀 **Lucky Clover** ×${ud.items.clover}\n> x2 XP selama 5 menit`);
    if (ud.items.timewarp > 0) buffs.push(`⏳ **Time Warp** ×${ud.items.timewarp}\n> Auto Farm 2x lebih cepat 60 detik`);

    const instants = [];
    if (ud.items.gempack > 0) instants.push(`💎 **Gem Pack** ×${ud.items.gempack}\n> +150.000 Gems instant`);
    if (ud.items.xpscroll > 0) instants.push(`📜 **XP Scroll** ×${ud.items.xpscroll}\n> +50.000 XP instant`);
    if (ud.items.bomb > 0) instants.push(`💣 **Block Bomb** ×${ud.items.bomb}\n> +100 Pot O' Gems`);

    const others = [];
    if (ud.items.gbc > 0) others.push(`EMOJI.gbc**GBC**×{ud.items.gbc}\n> Tiket gacha`);

    const ancesLevel = ud.items.ancesRedLevel || 0;
    const gangCount = ud.items.gang || 0;
    const passive = [];
    passive.push(`ANCESRED.emoji**AncesRed** · Lv.**{ancesLevel}/ANCESRED.maxLevel** · +{ANCES_RED.bonuses[ancesLevel]}% Gems`);
    passive.push(`GANG.emoji**Gang** · **{gangCount}/GANG.maxCount** · +{Math.min(gangCount, GANG.maxCount) * GANG.bonusPerGang}% Gems`);

    let desc = `**🔴 PASSIVE BOOSTER**\n\n${passive.join('\n')}\n\n`;
    if (buffs.length > 0) desc += `**✨ BUFF ITEM**\n\n${buffs.join('\n\n')}\n\n`;
    if (instants.length > 0) desc += `**⚡ INSTANT ITEM**\n\n${instants.join('\n\n')}\n\n`;
    if (others.length > 0) desc += `**🎰 GACHA**\n\n${others.join('\n\n')}`;
    if (buffs.length === 0 && instants.length === 0 && others.length === 0) desc += `\n\n*Inventory item kosong.*`;

    return new EmbedBuilder().setColor('#E67E22').setTitle('🎒 Items').setDescription(desc);
}

function itemsButtons(ud) {
    const rows = [];
    const buffRow = new ActionRowBuilder();
    if (ud.items.arroz > 0) buffRow.addComponents(new ButtonBuilder().setCustomId('use_arroz').setLabel(`🍗 Arroz (${ud.items.arroz})`).setStyle(ButtonStyle.Primary));
    if (ud.items.clover > 0) buffRow.addComponents(new ButtonBuilder().setCustomId('use_clover').setLabel(`🍀 Clover (${ud.items.clover})`).setStyle(ButtonStyle.Primary));
    if (ud.items.timewarp > 0) buffRow.addComponents(new ButtonBuilder().setCustomId('use_timewarp').setLabel(`⏳ Time Warp (${ud.items.timewarp})`).setStyle(ButtonStyle.Primary));
    if (buffRow.components.length > 0) rows.push(buffRow);

    const instRow = new ActionRowBuilder();
    if (ud.items.gempack > 0) instRow.addComponents(new ButtonBuilder().setCustomId('use_gempack').setLabel(`💎 Gem Pack (${ud.items.gempack})`).setStyle(ButtonStyle.Success));
    if (ud.items.xpscroll > 0) instRow.addComponents(new ButtonBuilder().setCustomId('use_xpscroll').setLabel(`📜 XP Scroll (${ud.items.xpscroll})`).setStyle(ButtonStyle.Success));
    if (ud.items.bomb > 0) instRow.addComponents(new ButtonBuilder().setCustomId('use_bomb').setLabel(`💣 Bomb (${ud.items.bomb})`).setStyle(ButtonStyle.Success));
    if (instRow.components.length > 0) rows.push(instRow);

    const ancesLevel = ud.items.ancesRedLevel || 0;
    if (ancesLevel < ANCES_RED.maxLevel) {
        const cost = ANCES_RED.costs[ancesLevel];
        const costText = cost.gems > 0 ? `cost.gems.toLocaleString()Gems`:`{cost.bgl} BGL`;
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('upgrade_ancesred').setLabel(`Upgrade Ances Red → Lv.ancesLevel+1({costText})`).setEmoji(EMOJI.ancesred).setStyle(ButtonStyle.Danger)
        ));
    }

    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
}

// ==========================================
// 🎰 GACHA EMBED
// ==========================================
function gachaEmbed(ud) {
    const cfg = GACHA_CONFIG;
    const gangGlobalOwned = db.getGlobalStat('gang_owned');
    const gangRemaining = Math.max(0, cfg.gangGlobalSupply - gangGlobalOwned);

    const prizeLines = [];
    for (const p of cfg.prizes) {
        const isGang = p.type === 'gang';
        const isAnces = p.type === 'ancesred';
        const mark = isGang ? '🎉 ' : (isAnces ? '🔴 ' : '');
        prizeLines.push(`**${p.chance}%** mark{p.label}`);
    }

    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🎰 Gacha — Lucky Roll')
        .setDescription(
            `Coba keberuntunganmu! Pakai ${EMOJI.gbc} **GBC** untuk roll.\n\n` +
            `EMOJI.gbc**GBCkamu:****{ud.items.gbc || 0}**\n` +
            `🎯 **Total roll:** ${ud.totalGachaRolls}\n` +
            `${GANG.emoji} **Gang global:** gangGlobalOwned/{cfg.gangGlobalSupply} *(${gangRemaining} sisa)*`
        )
        .addFields({ name: '🎁  Hadiah & Persentase', value: prizeLines.join('\n'), inline: false })
        .setFooter({ text: '1 roll = 1 GBC • Tanpa limit harian' })
        .setTimestamp();
}
function gachaButtons(ud) {
    const gbc = ud.items.gbc || 0;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('gacha_roll_1').setLabel('🎲 Roll 1x').setStyle(ButtonStyle.Success).setDisabled(gbc < 1),
            new ButtonBuilder().setCustomId('gacha_roll_10').setLabel('🎲 Roll 10x').setStyle(ButtonStyle.Primary).setDisabled(gbc < 10)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop_items').setLabel('🛒 Beli GBC').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

// ==========================================
// TOOLS
// ==========================================
function toolsEmbed(ud) {
    const t = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    return new EmbedBuilder().setColor('#3498DB').setTitle('🛠️ Tools')
        .setDescription((t ? `**Equipped:** t.emoji**{t.name} x${t.multiplier}**` : '*Tidak ada tool*') + `\n\n*Tools multiply Gems & XP.*`);
}
function toolsButtons(ud) {
    const r = [];
    if (ud.ownedTools.length > 0) {
        const opts = ud.ownedTools.map(k => {
            const t = SHOP_TOOLS[k];
            return new StringSelectMenuOptionBuilder()
                .setLabel(t.name).setValue(`equip_${k}`)
                .setDescription(`x${t.multiplier} Gems • ${t.blocksPerBreak} far`)
                .setDefault(ud.equippedTool === k);
        });
        opts.push(new StringSelectMenuOptionBuilder().setLabel('Unequip').setValue('unequip').setDescription('Lepas (x1)').setDefault(!ud.equippedTool));
        r.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_tool').setPlaceholder('Pilih tool').addOptions(opts)));
    }
    r.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)));
    return r;
}

// ==========================================
// PROFILE
// ==========================================
function profileEmbed(ud) {
    const t = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const tv = getTotalLockValue(ud);
    const ancesLevel = ud.items.ancesRedLevel || 0;
    const gangCount = ud.items.gang || 0;
    const totalBoost = getGemMultiplier(ud);
    return new EmbedBuilder().setColor('#F1C40F').setTitle(`👤 Profile — ${ud.username}`)
        .addFields(
            { name: '🏆 Level', value: `${ud.level}`, inline: true },
            { name: '🛠️ Tool', value: t ? `${t.emoji} ${t.name}` : 'Tidak ada', inline: true },
            { name: '💰 Gems', value: Math.floor(ud.gems).toLocaleString(), inline: true },
            { name: `${EMOJI.wl} WL`, value: formatWL(ud.locks.wl), inline: true },
            { name: '⭐ SP', value: `${ud.skillPoints}`, inline: true },
            { name: '🎰 Total Roll', value: `${ud.totalGachaRolls}`, inline: true },
            { name: '💎 Booster', value:
                `ANCESRED.emoji**AncesRed**·Lv.{ancesLevel}/${ANCES_RED.maxLevel}\n` +
                `${GANG.emoji} **Gang** · gangCount/{GANG.maxCount}\n` +
                `✨ **Total Boost** · **+${Math.round((totalBoost - 1) * 100)}%** Gems`, inline: false },
            { name: '🔒 Locks', value:
                `${EMOJI.wl} **WL**: ${formatWL(ud.locks.wl)}\n` +
                `${EMOJI.dl} **DL**: ${formatWL(ud.locks.dl)}\n` +
                `${EMOJI.bgl} **BGL**: ${formatWL(ud.locks.bgl)}\n` +
                `${EMOJI.black} **BGLB**: ${formatWL(ud.locks.bglb)}\n` +
                `**Total: ${formatWL(tv)} WL**`, inline: false }
        );
}
function profileButtons() {
    return [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary))];
}

// ==========================================
// LEADERBOARD
// ==========================================
async function generateLeaderboardEmbed(guildId) {
    const all = db.getAllUsers();
    const ids = await getGuildMemberIds(guildId);
    const g = client.guilds.cache.get(guildId);
    const gn = g ? g.name : 'Server';
    const entries = all
        .filter(u => ids.has(u.userId))
        .map(u => ({ username: u.username, locks: u.locks, level: u.level, totalValue: getTotalLockValue(u) }))
        .filter(e => e.totalValue > 0);
    entries.sort((a, b) => b.totalValue - a.totalValue);
    const top = entries.slice(0, 20);
    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((e, i) => {
        const r = medals[i] || `**#${i + 1}**`;
        const p = [];
        if (e.locks.wl > 0) p.push(`${EMOJI.wl} ${formatWL(e.locks.wl)}`);
        if (e.locks.dl > 0) p.push(`${EMOJI.dl} ${formatWL(e.locks.dl)}`);
        if (e.locks.bgl > 0) p.push(`${EMOJI.bgl} ${formatWL(e.locks.bgl)}`);
        if (e.locks.bglb > 0) p.push(`${EMOJI.black} ${formatWL(e.locks.bglb)}`);
        return `r**{e.username}** (Lv.${e.level})\n> ${p.join(' | ')}\n> 💰 **${formatWL(e.totalValue)} WL**`;
    });
    if (lines.length === 0) lines.push('*Belum ada pemain dengan lock.*');
    return new EmbedBuilder().setColor('#FFD700').setTitle(`🏆 Leaderboard — ${gn}`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Total ${entries.length} pemain • Update tiap ${LEADERBOARD_UPDATE_INTERVAL / 1000} detik` })
        .setTimestamp();
}
async function refreshAllLeaderboards() {
    for (const [gid, msg] of guildLeaderboards.entries()) {
        try { await msg.edit({ embeds: [await generateLeaderboardEmbed(gid)] }); } catch {}
    }
}

// ==========================================
// RENDER ROUTER
// ==========================================
function renderEmbed(ud) {
    switch(ud.currentView) {
        case 'shop': return shopMainEmbed(ud);
        case 'shop_tools': return shopToolsEmbed(ud);
        case 'shop_blocks': return shopBlocksEmbed(ud, ud._shopBlocksPage || 'low');
        case 'shop_items': return shopItemsEmbed(ud);
        case 'shop_locks': return shopLocksEmbed(ud);
        case 'change_block': return changeBlockEmbed(ud, ud._changeBlockPage || 'low');
        case 'skills': return skillsEmbed(ud);
        case 'items': return itemsEmbed(ud);
        case 'tools': return toolsEmbed(ud);
        case 'profile': return profileEmbed(ud);
        case 'event': return eventEmbed(ud);
        case 'gacha': return gachaEmbed(ud);
        default: return mainEmbed(ud);
    }
}
function renderButtons(ud) {
    switch(ud.currentView) {
        case 'shop': return shopMainButtons();
        case 'shop_tools': return shopToolsButtons();
        case 'shop_blocks': return shopBlocksButtons(ud, ud._shopBlocksPage || 'low');
        case 'shop_items': return shopItemsButtons();
        case 'shop_locks': return shopLocksButtons();
        case 'change_block': return changeBlockButtons(ud, ud._changeBlockPage || 'low');
        case 'skills': return skillsButtons(ud);
        case 'items': return itemsButtons(ud);
        case 'tools': return toolsButtons(ud);
        case 'profile': return profileButtons();
        case 'event': return eventButtons();
        case 'gacha': return gachaButtons(ud);
        default: return mainButtons(ud);
    }
}

// ==========================================
// BREAK LOGIC
// ==========================================
function doBreak(ud) {
    const bt = ud.selectedBlock;
    const bd = SHOP_BLOCKS[bt];
    if (!bd) { ud.selectedBlock = 'dirt'; return { switched: true }; }

    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const far = tool ? tool.blocksPerBreak : 1;
    const ev = ud.event;
    const unl = isUnlimited(bt);

    if (!unl) {
        if ((ud.blocks[bt] || 0) <= 0) {
            const fb = Object.keys(SHOP_BLOCKS).find(k => k !== bt && (isUnlimited(k) || (ud.blocks[k] || 0) > 0));
            if (fb) {
                ud.selectedBlock = fb;
                ud.lastBreak = `⚠️ ${bd.name} habis! Switch ke ${SHOP_BLOCKS[fb].name}.`;
                return { switched: true };
            }
            ud.lastBreak = '⚠️ Semua block habis! Auto Farm berhenti.';
            ud.autoFarm = false;
            return null;
        }
    }
    const brk = unl ? far : Math.min(far, ud.blocks[bt] || 0);
    if (!unl) ud.blocks[bt] -= brk;

    const tm = tool ? tool.multiplier : 1;
    const gsm = 1 + (ud.skills.gem_hunter * 0.10);
    const gbm = isBuffActive(ud, 'arroz') ? 2 : 1;
    const pm = getGemMultiplier(ud);

    let tg = 0;
    for (let i = 0; i < brk; i++) {
        const bg = Math.floor(Math.random() * (bd.gemsMax - bd.gemsMin + 1)) + bd.gemsMin;
        let g = Math.floor(bg * tm * gsm * gbm * pm * ev.gemsMult);
        if (Math.random() < ud.skills.lucky_find * 0.02) g *= 10;
        tg += g;
    }
    const xsm = 1 + (ud.skills.xp_boost * 0.10);
    const xbm = isBuffActive(ud, 'clover') ? 2 : 1;
    let tx = 0;
    for (let i = 0; i < brk; i++) {
        const bx = Math.floor(Math.random() * (bd.xpMax - bd.xpMin + 1)) + bd.xpMin;
        tx += Math.floor(bx * xsm * xbm * ev.gemsMult);
    }
    let ret = 0;
    if (!unl) {
        for (let i = 0; i < brk; i++) if (Math.random() < BASE_RETURN_CHANCE) ret++;
        ret = Math.floor(ret * ev.blocksMult);
        ud.blocks[bt] += ret;
    }
    ud.gems += tg;
    ud.xp += tx;
    const lg = checkLevelUp(ud);
    return { gemsGained: tg, xpGained: tx, blockType: bt, levelsGained: lg, blocksBroken: brk, returned: ret, unlimited: unl };
}

function formatBreakLog(r, prefix = 'Auto') {
    const bd = SHOP_BLOCKS[r.blockType];
    let m = `prefix[{bd.name}]: -${r.blocksBroken}`;
    if (r.returned > 0) m += ` (+${r.returned})`;
    m += ` → +${r.gemsGained.toLocaleString()} EMOJI.gems/+{r.xpGained.toLocaleString()} XP`;
    if (r.levelsGained > 0) m += ` 🎉 **LEVEL UP! +${r.levelsGained} SP**`;
    return m;
}

// ==========================================
// AFK CHECK
// ==========================================
function stopAfkCheck(userId) {
    const t = afkCheckTimers.get(userId);
    if (!t) return;
    if (t.nextTimer) clearTimeout(t.nextTimer);
    if (t.timeoutTimer) clearTimeout(t.timeoutTimer);
    afkCheckTimers.delete(userId);
}
function scheduleAfkCheck(userId, guildId) {
    stopAfkCheck(userId);
    const cfg = db.getAfkCheckConfig(guildId);
    if (!cfg || !cfg.enabled) return;
    const ms = cfg.intervalMinutes * 60 * 1000;
    const nextTimer = setTimeout(() => doAfkCheck(userId, guildId), ms);
    afkCheckTimers.set(userId, { nextTimer, timeoutTimer: null, guildId });
    console.log(`⏰ [AFK] Scheduled ${userId} dalam ${cfg.intervalMinutes} menit`);
}
async function doAfkCheck(userId, guildId) {
    const cfg = db.getAfkCheckConfig(guildId);
    if (!cfg || !cfg.enabled) { stopAfkCheck(userId); return; }
    const ud = userCache.get(userId);
    if (!ud || !ud.autoFarm) { stopAfkCheck(userId); return; }
    const dbThread = db.getUserThread(guildId, userId);
    if (!dbThread) { scheduleAfkCheck(userId, guildId); return; }
    const guild = client.guilds.cache.get(guildId);
    if (!guild) { stopAfkCheck(userId); return; }
    const thread = await guild.channels.fetch(dbThread.threadId).catch(() => null);
    if (!thread || thread.archived) { scheduleAfkCheck(userId, guildId); return; }
    const timeoutMs = cfg.timeoutSeconds * 1000;
    const embed = new EmbedBuilder().setColor('#F1C40F').setTitle('⏰ Cek Online')
        .setDescription(`Halo <@${userId}>!\n\nKamu masih online?\n\n> Klik **✅ Masih Online** dalam **${cfg.timeoutSeconds} detik**.\n> Kalau tidak, **Auto Farm dimatikan** & **thread dihapus**.`)
        .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`afk_online_${userId}`).setLabel('✅ Masih Online').setStyle(ButtonStyle.Success)
    );
    let msg;
    try { msg = await thread.send({ embeds: [embed], components: [row] }); }
    catch (e) { scheduleAfkCheck(userId, guildId); return; }
    const timeoutTimer = setTimeout(() => handleAfkTimeout(userId, guildId, msg), timeoutMs);
    afkCheckTimers.set(userId, { nextTimer: null, timeoutTimer, guildId });
    console.log(`⏰ [AFK] Cek dikirim ke ${userId}, timeout ${cfg.timeoutSeconds}s`);
}
async function handleAfkTimeout(userId, guildId, msg) {
    console.log(`⏰ [AFK] Timeout! ${userId} tidak konfirmasi.`);
    const ud = userCache.get(userId);
    if (ud) {
        ud.autoFarm = false;
        ud.lastBreak = '⏰ Auto Farm mati (tidak konfirmasi online).';
        stopAutoFarm(userId);
        db.saveUser(ud);
    }
    try {
        await msg.edit({
            embeds: [new EmbedBuilder().setColor('#ED4245').setTitle('⏰ Timeout')
                .setDescription(`<@${userId}> tidak konfirmasi.\n\n> Auto Farm dimatikan.\n> Thread akan dihapus...`).setTimestamp()],
            components: []
        });
    } catch {}
    const pm = activeMessages.get(userId);
    if (pm && ud) { try { await pm.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
    await new Promise(r => setTimeout(r, 3000));
    try {
        const dbThread = db.getUserThread(guildId, userId);
        if (dbThread) {
            const g = client.guilds.cache.get(guildId);
            if (g) {
                const thread = await g.channels.fetch(dbThread.threadId).catch(() => null);
                if (thread) {
                    try { await thread.delete('AFK timeout'); console.log(`⏰ [AFK] Thread ${thread.id} dihapus`); }
                    catch { try { await thread.setArchived(true, 'AFK timeout'); } catch {} }
                }
            }
            db.removeUserThread(guildId, userId);
        }
    } catch (e) { console.error('AFK delete thread:', e.message); }
    activeMessages.delete(userId);
    userThreads.delete(userId);
    afkCheckTimers.delete(userId);
}

// ==========================================
// AUTO FARM
// ==========================================
function startAutoFarm(userId) {
    const ex = autoFarmIntervals.get(userId);
    if (ex) { clearInterval(ex); autoFarmIntervals.delete(userId); }
    const ud0 = userCache.get(userId);
    if (!ud0) return;
    const interval = getAutoInterval(ud0);
    const myToken = (autoFarmTokens.get(userId) || 0) + 1;
    autoFarmTokens.set(userId, myToken);
    ud0._acc = { gems: 0, xp: 0, blocks: 0, returned: 0, levels: 0, blockType: null };
    userLastEdit.set(userId, 0);

    const intervalId = setInterval(async () => {
        try {
            if (autoFarmTokens.get(userId) !== myToken) {
                clearInterval(intervalId);
                if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
                return;
            }
            if (autoFarmIntervals.get(userId) !== intervalId) { clearInterval(intervalId); return; }
            const ud = userCache.get(userId);
            if (!ud || ud.autoFarm !== true) {
                clearInterval(intervalId);
                if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
                return;
            }
            const li = userLastInteraction.get(userId) || 0;
            if ((Date.now() - li) < INTERACTION_LOCK_MS) return;
            const r = doBreak(ud);
            if (r && !r.switched) {
                if (!ud._acc) ud._acc = { gems: 0, xp: 0, blocks: 0, returned: 0, levels: 0, blockType: null };
                ud._acc.gems += r.gemsGained;
                ud._acc.xp += r.xpGained;
                ud._acc.blocks += r.blocksBroken;
                ud._acc.returned += r.returned;
                ud._acc.levels += r.levelsGained;
                ud._acc.blockType = r.blockType;
            }
            if (ud.autoFarm === false) {
                autoFarmTokens.set(userId, (autoFarmTokens.get(userId) || 0) + 1);
                clearInterval(intervalId);
                if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
                db.saveUser(ud);
                if (ud._acc && ud._acc.blocks > 0) {
                    const bd = SHOP_BLOCKS[ud._acc.blockType];
                    let m = `Auto [bd.name]:-{ud._acc.blocks}`;
                    if (ud._acc.returned > 0) m += ` (+${ud._acc.returned})`;
                    m += ` → +${ud._acc.gems.toLocaleString()} EMOJI.gems/+{ud._acc.xp.toLocaleString()} XP`;
                    if (ud._acc.levels > 0) m += ` 🎉 **LEVEL UP! +${ud._acc.levels} SP**`;
                    ud.lastBreak = m;
                    ud._acc = null;
                }
                const mm = activeMessages.get(userId);
                if (mm) { try { await mm.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
                return;
            }
            if (!ud._lastSave || Date.now() - ud._lastSave > 3000) {
                db.saveUser(ud);
                ud._lastSave = Date.now();
            }
            const le = userLastEdit.get(userId) || 0;
            if (Date.now() - le < EDIT_THROTTLE_MS) return;
            if (autoFarmTokens.get(userId) !== myToken) return;
            if (autoFarmIntervals.get(userId) !== intervalId) return;
            if (ud.autoFarm !== true) return;
            if (ud._acc && ud._acc.blocks > 0) {
                const bd = SHOP_BLOCKS[ud._acc.blockType];
                let m = `Auto [bd.name]:-{ud._acc.blocks}`;
                if (ud._acc.returned > 0) m += ` (+${ud._acc.returned})`;
                m += ` → +${ud._acc.gems.toLocaleString()} EMOJI.gems/+{ud._acc.xp.toLocaleString()} XP`;
                if (ud._acc.levels > 0) m += ` 🎉 **LEVEL UP! +${ud._acc.levels} SP**`;
                ud.lastBreak = m;
                ud._acc = { gems: 0, xp: 0, blocks: 0, returned: 0, levels: 0, blockType: null };
            }
            userLastEdit.set(userId, Date.now());
            const msg = activeMessages.get(userId);
            if (msg) {
                try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); }
                catch (e) {
                    clearInterval(intervalId);
                    if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
                }
            } else {
                clearInterval(intervalId);
                if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
            }
        } catch (err) { console.error('❌ Auto farm tick:', err.message); }
    }, interval);
    autoFarmIntervals.set(userId, intervalId);
}
function stopAutoFarm(userId) {
    autoFarmTokens.set(userId, (autoFarmTokens.get(userId) || 0) + 1);
    const id = autoFarmIntervals.get(userId);
    if (id) { clearInterval(id); autoFarmIntervals.delete(userId); }
    userLastEdit.delete(userId);
    const ud = userCache.get(userId);
    if (ud) ud._acc = null;
    stopAfkCheck(userId);
}

// ==========================================
// MODAL BUILDER
// ==========================================
function buildBuyModal(title, customId, priceInfo) {
    const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
    const input = new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel(priceInfo || 'Jumlah')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: 500')
        .setRequired(true)
        .setMaxLength(10);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

// ==========================================
// REALTIME RESET
// ==========================================
async function realtimeResetPlayer(targetUser) {
    const userId = targetUser.id;
    const username = targetUser.username;
    if (autoFarmIntervals.has(userId)) stopAutoFarm(userId);
    stopAfkCheck(userId);
    const oldMsg = activeMessages.get(userId);
    userCache.delete(userId);
    activeMessages.delete(userId);
    userThreads.delete(userId);
    userLastInteraction.delete(userId);
    userLastEdit.delete(userId);
    try { for (const [gid] of client.guilds.cache) db.removeUserThread(gid, userId); } catch {}
    const success = db.resetUser(userId);
    if (oldMsg) {
        try {
            await oldMsg.edit({
                embeds: [new EmbedBuilder().setColor('#ED4245').setTitle('♻️ Akun Direset')
                    .setDescription(`**@${username}** telah direset.\n\n> 🏆 Level: **1**\n> 💰 Gems: **500.000**\n> ${EMOJI.wl} WL: **1**`).setTimestamp()],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('nav_main').setLabel('🔄 Mulai Ulang').setStyle(ButtonStyle.Success)
                )]
            });
        } catch {}
    }
    await refreshAllLeaderboards();
    return success;
}
async function invalidateOldPanel(userId, reason = 'Panel ini sudah tidak aktif.') {
    const om = activeMessages.get(userId);
    if (!om) return;
    try { await om.edit({ embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`❌ ${reason}`)], components: [] }); } catch {}
    activeMessages.delete(userId);
}

// ==========================================
// SETUP GUILD
// ==========================================
async function setupGuild(guild, panelChannelId, leaderboardChannelId) {
    try {
        const pc = await client.channels.fetch(panelChannelId).catch(() => null);
        if (pc) {
            const msgs = await pc.messages.fetch({ limit: 50 }).catch(() => new Map());
            for (const m of msgs.values()) {
                if (m.author.id === client.user.id && m.components.length > 0) await m.delete().catch(() => {});
            }
            let dt = 0;
            const safeDel = async (t) => {
                try {
                    if (t.archived) { try { await t.setArchived(false, 'Cleanup'); await new Promise(r => setTimeout(r, 500)); } catch {} }
                    await t.delete('Cleanup'); dt++;
                } catch {
                    try { try { await t.setLocked(true); } catch {} await t.setArchived(true); dt++; } catch {}
                }
            };
            try {
                const act = await pc.threads.fetchActive();
                for (const t of act.threads.values()) if (t.name.startsWith('🌱')) await safeDel(t);
            } catch {}
            for (const type of ['public', 'private']) {
                try {
                    let before, keep = true;
                    while (keep) {
                        const arch = await pc.threads.fetchArchived({ type, limit: 100, before });
                        if (!arch.threads || arch.threads.size === 0) break;
                        for (const t of arch.threads.values()) if (t.name.startsWith('🌱')) await safeDel(t);
                        const last = arch.threads.last()?.archivedAt;
                        if (!last || last === before) keep = false; else before = last;
                    }
                } catch {}
            }
            const embed = new EmbedBuilder().setColor('#57F287').setTitle('🌱 GrowExs Farming')
                .setDescription('Welcome to **GrowExs**!\n\nPress **Start Farming** below or use `/farming`.\n\n⚠️ Setiap interval tertentu kamu diminta konfirmasi online. Kalau tidak direspon, Auto Farm mati & thread dihapus.')
                .setFooter({ text: 'GrowExs Farm Guide' });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('start_farming').setLabel('Start Farming').setEmoji('📖').setStyle(ButtonStyle.Success)
            );
            await pc.send({ embeds: [embed], components: [row] });
            console.log(`📖 [${guild.name}] Panel terkirim (thread lama: ${dt})`);
        }
        const lc = await client.channels.fetch(leaderboardChannelId).catch(() => null);
        if (lc) {
            const msgs = await lc.messages.fetch({ limit: 30 }).catch(() => new Map());
            for (const m of msgs.values()) if (m.author.id === client.user.id) await m.delete().catch(() => {});
            const msg = await lc.send({ embeds: [await generateLeaderboardEmbed(guild.id)] });
            guildLeaderboards.set(guild.id, msg);
            db.updateLeaderboardMessage(guild.id, msg.id);
            console.log(`🏆 [${guild.name}] Leaderboard aktif`);
        }
    } catch (err) { console.error(`❌ Setup guild ${guild.name}:`, err.message); }
}

// ==========================================
// BOT READY
// ==========================================
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} siap!`);
    console.log(`🌐 ${client.guilds.cache.size} server`);
    await db.connectDB();

    setInterval(() => {
        try {
            const src = path.join(__dirname, 'growexs.db');
            const dst = path.join(__dirname, `backup_${Date.now()}.db`);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dst);
                console.log(`💾 Backup: ${path.basename(dst)}`);
            }
        } catch (e) {}
    }, 6 * 60 * 60 * 1000);

    const cfgs = db.getAllGuildConfigs();
    for (const c of cfgs) {
        const g = client.guilds.cache.get(c.guildId);
        if (!g) continue;
        console.log(`🔧 Setup: ${g.name}`);
        await setupGuild(g, c.panelChannelId, c.leaderboardChannelId);
    }

    setInterval(refreshAllLeaderboards, LEADERBOARD_UPDATE_INTERVAL);
});

// ==========================================
// EVENT LISTENERS
// ==========================================
client.on('guildCreate', g => console.log(`➕ Join: g.name({g.id})`));

client.on('guildMemberAdd', async m => {
    try { await handleMemberJoin(m); } catch (e) {}
});

client.on('messageCreate', async m => {
    try {
        await utility.runAutomod(m);
        if (await utility.handleTagMessage(m)) return;
    } catch (e) {}
});

client.on('messageReactionAdd', async (r, u) => {
    try {
        await utility.handleReactionAdd(r, u);
        await utility.handleStarboard(r, u, true);
    } catch (e) {}
});

client.on('messageReactionRemove', async (r, u) => {
    try { await utility.handleReactionRemove(r, u); } catch (e) {}
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try { await voiceMod.handleVoiceStateUpdate(client, oldState, newState); } catch (e) {}
});

client.on('channelDelete', async (channel) => {
    try { await voiceMod.handleChannelDelete(client, channel); } catch (e) {}
});

// ==========================================
// GACHA HELPER
// ==========================================
function rollGacha(ud) {
    const totalChance = GACHA_CONFIG.prizes.reduce((sum, p) => sum + p.chance, 0);
    let roll = Math.random() * totalChance;
    let selected = GACHA_CONFIG.prizes[0];

    for (const p of GACHA_CONFIG.prizes) {
        roll -= p.chance;
        if (roll <= 0) { selected = p; break; }
    }

    const result = { label: selected.label, type: selected.type, success: true, extra: '' };

    if (selected.type === 'gems') {
        ud.gems += selected.amount;
        result.extra = `+${selected.amount.toLocaleString()} ${EMOJI.gems}`;
    }
    else if (selected.type === 'xp') {
        const beforeLvl = ud.level;
        ud.xp += selected.amount;
        const lvUp = checkLevelUp(ud);
        result.extra = `+${selected.amount.toLocaleString()} XP`;
        if (lvUp > 0) result.extra += ` · 🎉 Level ${beforeLvl} → ${ud.level}`;
    }
    else if (selected.type === 'gbc') {
        ud.items.gbc = (ud.items.gbc || 0) + selected.amount;
        result.extra = `+${selected.amount} ${EMOJI.gbc}`;
    }
    else if (selected.type === 'bomb') {
        ud.items.bomb = (ud.items.bomb || 0) + selected.amount;
        result.extra = `+${selected.amount} 💣`;
    }
    else if (selected.type === 'arroz') {
        ud.items.arroz = (ud.items.arroz || 0) + selected.amount;
        result.extra = `+${selected.amount} 🍗`;
    }
    else if (selected.type === 'clover') {
        ud.items.clover = (ud.items.clover || 0) + selected.amount;
        result.extra = `+${selected.amount} 🍀`;
    }
    else if (selected.type === 'gempack') {
        ud.items.gempack = (ud.items.gempack || 0) + selected.amount;
        result.extra = `+${selected.amount} 💎`;
    }
    else if (selected.type === 'xpscroll') {
        ud.items.xpscroll = (ud.items.xpscroll || 0) + selected.amount;
        result.extra = `+${selected.amount} 📜`;
    }
    else if (selected.type === 'timewarp') {
        ud.items.timewarp = (ud.items.timewarp || 0) + selected.amount;
        result.extra = `+${selected.amount} ⏳`;
    }
    else if (selected.type === 'ancesred') {
        ud.items.ancesRedLevel = (ud.items.ancesRedLevel || 0) + selected.amount;
        if (ud.items.ancesRedLevel > ANCES_RED.maxLevel) ud.items.ancesRedLevel = ANCES_RED.maxLevel;
        result.extra = `ANCESRED.emoji→Lv.{ud.items.ancesRedLevel}`;
    }
    else if (selected.type === 'gang') {
        const currentOwned = db.getGlobalStat('gang_owned');
        if (currentOwned >= GACHA_CONFIG.gangGlobalSupply) {
            result.success = false;
            result.extra = '❌ Gang sudah habis! Dapat 500.000 gems sebagai gantinya.';
            ud.gems += 500000;
        } else {
            ud.items.gang = (ud.items.gang || 0) + selected.amount;
            if (ud.items.gang > GANG.maxCount) ud.items.gang = GANG.maxCount;
            db.incrementGlobalStat('gang_owned', selected.amount);
            result.extra = `GANG.emojix{ud.items.gang}/${GANG.maxCount}`;
        }
    }

    ud.totalGachaRolls = (ud.totalGachaRolls || 0) + 1;
    return result;
}

// ==========================================
// INTERACTION HANDLER
// ==========================================
client.on('interactionCreate', async interaction => {
    try {
        if (!checkOwnerOnly(interaction)) return blockNonOwner(interaction);
        if (await updateMod.handleUpdateInteraction(interaction)) return;
        if (await handleAdminInteraction(interaction)) return;
        if (await utility.handleUtilityInteraction(interaction)) return;
        if (await voiceMod.handleVoiceInteraction(interaction)) return;

        const _u = interaction.user.id;
        if (_u) userLastInteraction.set(_u, Date.now());

        // ==========================================
        // SLASH COMMANDS
        // ==========================================
        if (interaction.isChatInputCommand()) {
            const userId = interaction.user.id;

            if (interaction.commandName === 'afkcheck') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const sub = interaction.options.getSubcommand();

                if (sub === 'set') {
                    const interval = interaction.options.getInteger('interval');
                    const timeout = interaction.options.getInteger('timeout');
                    const enabled = interaction.options.getBoolean('enabled');
                    const finalEnabled = enabled === null ? true : enabled;
                    db.setAfkCheckConfig(interaction.guildId, { enabled: finalEnabled, intervalMinutes: interval, timeoutSeconds: timeout });
                    return interaction.editReply({
                        content: `✅ **AFK Check diset!**\n\n> 🔄 Interval: **${interval} menit**\n> ⏱️ Timeout: **${timeout} detik**\n> 🟢 Status: ${finalEnabled ? '**Aktif**' : '**Nonaktif**'}`
                    });
                }
                if (sub === 'status') {
                    const c = db.getAfkCheckConfig(interaction.guildId);
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(c.enabled ? '#57F287' : '#ED4245')
                            .setTitle('⏰ AFK Check Config')
                            .addFields(
                                { name: 'Status', value: c.enabled ? '✅ Aktif' : '❌ Nonaktif', inline: true },
                                { name: 'Interval', value: `${c.intervalMinutes} menit`, inline: true },
                                { name: 'Timeout', value: `${c.timeoutSeconds} detik`, inline: true }
                            )]
                    });
                }
                if (sub === 'disable') {
                    const c = db.getAfkCheckConfig(interaction.guildId);
                    db.setAfkCheckConfig(interaction.guildId, { ...c, enabled: false });
                    return interaction.editReply({ content: '❌ **AFK Check dimatikan.**' });
                }
                return;
            }

            if (interaction.commandName === 'setup') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const p = interaction.options.getChannel('panel');
                const l = interaction.options.getChannel('leaderboard');
                db.setGuildConfig(interaction.guildId, p.id, l.id);
                await setupGuild(interaction.guild, p.id, l.id);
                return interaction.editReply({ content: `✅ Setup selesai!\n> Panel: ${p}\n> Leaderboard: ${l}` });
            }

            if (interaction.commandName === 'unsetup') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                db.removeGuildConfig(interaction.guildId);
                guildLeaderboards.delete(interaction.guildId);
                guildMemberCache.delete(interaction.guildId);
                return interaction.reply({ content: `✅ Config dihapus.`, ephemeral: true });
            }

            if (interaction.commandName === 'resetplayer') {
                await interaction.deferReply({ ephemeral: true });
                const tu = interaction.options.getUser('player');
                if (!tu) return interaction.editReply({ content: '❌ Player tidak valid.' });
                const m = interaction.guild ? await interaction.guild.members.fetch(userId).catch(() => null) : null;
                if (!isEventManager(m)) return interaction.editReply({ content: `🔒 Hanya Event Manager / Admin.` });
                const ok = await realtimeResetPlayer(tu);
                if (!ok) return interaction.editReply({ content: `⚠️ Player **${tu.username}** belum pernah main.` });
                return interaction.editReply({ content: `✅ **Reset (REALTIME)!**\n\n> 👤 Player: **${tu.username}**` });
            }

            if (interaction.commandName === 'farming') {
                await interaction.deferReply();
                const ud = loadUser(userId, interaction.user.username);
                if (autoFarmIntervals.has(userId) && !ud.autoFarm) ud.autoFarm = true;
                userCache.set(userId, ud);
                ud.currentView = 'main';

                const em = activeMessages.get(userId);
                if (em) {
                    try {
                        await em.fetch();
                        await em.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                        return interaction.editReply({ content: `⚠️ Kamu sudah punya panel aktif di <#${em.channelId}>.` });
                    } catch { activeMessages.delete(userId); }
                }

                const dbt = db.getUserThread(interaction.guildId, userId);
                if (dbt) {
                    try {
                        const t = await interaction.guild.channels.fetch(dbt.threadId);
                        if (t && !t.archived) return interaction.editReply({ content: `⚠️ Kamu sudah punya thread: ${t}` });
                    } catch { db.removeUserThread(interaction.guildId, userId); }
                }

                const msg = await interaction.editReply({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, msg);
            }
            else if (interaction.commandName === 'event') {
                const ud = loadUser(userId, interaction.user.username);
                userCache.set(userId, ud);
                await interaction.reply({ embeds: [eventEmbed(ud)], ephemeral: true });
            }
            else if (interaction.commandName === 'customevent') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const m = interaction.guild ? await interaction.guild.members.fetch(userId).catch(() => null) : null;
                    if (!isEventManager(m)) return interaction.editReply({ content: `🔒 Hanya Event Manager / Admin.` });
                    const ud = loadUser(userId, interaction.user.username);
                    userCache.set(userId, ud);
                    const gm = interaction.options.getInteger('gems');
                    const bm = interaction.options.getInteger('blocks');
                    ud.event.gemsMult = gm;
                    ud.event.blocksMult = bm;
                    ud.event.name = `Custom Event (Gems xgm,Blocksx{bm})`;
                    db.saveUser(ud);
                    const msg = activeMessages.get(userId);
                    if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
                    return interaction.editReply({ content: `✅ Event: Gems xgm|Blocksx{bm}` });
                } catch (e) { return interaction.editReply({ content: `❌ Gagal: ${e.message}` }).catch(() => {}); }
            }
            return;
        }

        // ==========================================
        // SELECT MENU
        // ==========================================
        if (interaction.isStringSelectMenu()) {
            const userId = interaction.user.id;

            if (interaction.customId === 'select_tool') {
                let ud = userCache.get(userId);
                if (!ud) { ud = loadUser(userId, interaction.user.username); userCache.set(userId, ud); }
                if (autoFarmIntervals.has(userId)) {
                    stopAutoFarm(userId);
                    ud.autoFarm = false;
                    ud.lastBreak = 'Auto Farm dimatikan (interaksi lain).';
                    db.saveUser(ud);
                }
                const v = interaction.values[0];
                let msg = '';
                if (v === 'unequip') { ud.equippedTool = null; msg = '✅ Tool di-unequip.'; }
                else if (v.startsWith('equip_')) {
                    const k = v.replace('equip_', '');
                    if (ud.ownedTools.includes(k)) { ud.equippedTool = k; msg = `✅ **${SHOP_TOOLS[k].name}** di-equip!`; }
                }
                db.saveUser(ud);
                await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
                try { await interaction.followUp({ content: msg, ephemeral: true }); } catch {}
                return;
            }

            if (interaction.customId === 'main_menu_select') {
                let ud = userCache.get(userId);
                if (!ud) { ud = loadUser(userId, interaction.user.username); userCache.set(userId, ud); }
                if (autoFarmIntervals.has(userId)) {
                    stopAutoFarm(userId);
                    ud.autoFarm = false;
                    ud.lastBreak = 'Auto Farm dimatikan (interaksi lain).';
                    db.saveUser(ud);
                }
                const v = interaction.values[0];
                const viewMap = {
                    'menu_shop': 'shop',
                    'menu_items': 'items',
                    'menu_gacha': 'gacha',
                    'menu_profile': 'profile',
                    'menu_skills': 'skills',
                    'menu_tools': 'tools'
                };
                if (viewMap[v]) {
                    ud.currentView = viewMap[v];
                    if (viewMap[v] === 'shop') ud._shopBlocksPage = 'low';
                    if (viewMap[v] === 'change_block') ud._changeBlockPage = 'low';
                }
                await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
                return;
            }
            return;
        }

        // ==========================================
        // MODAL SUBMIT — BUY BLOCK PAKAI WL
        // ==========================================
        if (interaction.isModalSubmit()) {
            const userId = interaction.user.id;
            if (!lockUser(userId, 2000)) {
                return interaction.reply({ content: '⏳ Tunggu sebentar...', ephemeral: true }).catch(() => {});
            }

            const ud = loadUser(userId, interaction.user.username);
            userCache.set(userId, ud);

            if (autoFarmIntervals.has(userId)) {
                stopAutoFarm(userId);
                ud.autoFarm = false;
                ud.lastBreak = 'Auto Farm dimatikan (interaksi lain).';
            }

            const qtyRaw = interaction.fields.getTextInputValue('quantity');
            const qty = parseInt(qtyRaw);
            if (isNaN(qty) || qty <= 0 || qty > MAX_CUSTOM_QTY) {
                return interaction.reply({ content: `❌ Jumlah tidak valid! 1 - ${MAX_CUSTOM_QTY.toLocaleString()}.`, ephemeral: true });
            }

            let resp = '';

            if (interaction.customId.startsWith('modal_buyblock_')) {
                const k = interaction.customId.replace('modal_buyblock_', '');
                const b = SHOP_BLOCKS[k];
                if (!b) return interaction.reply({ content: '❌ Block invalid.', ephemeral: true });
                if (isUnlimited(k)) return interaction.reply({ content: `♾️ Unlimited!`, ephemeral: true });

                // ===== BAYAR PAKAI WL =====
                const totalWL = b.priceWL * qty;

                if (ud.locks.wl < totalWL) {
                    const needGems = Math.ceil(totalWL * WL_TO_GEMS);
                    return interaction.reply({
                        content: `❌ WL kurang! Butuh **${formatWL(totalWL)} EMOJI.wl**(~{needGems.toLocaleString()} gems), kamu punya **${formatWL(ud.locks.wl)} ${EMOJI.wl}**`,
                        ephemeral: true
                    });
                }

                ud.locks.wl -= totalWL;
                ud.blocks[k] = (ud.blocks[k] || 0) + qty;
                resp = `✅ Beli **b.namex{qty.toLocaleString()}**\n> Biaya: **${formatWL(totalWL)} ${EMOJI.wl}**\n> Sisa WL: ${formatWL(ud.locks.wl)}`;
            }
            else if (interaction.customId.startsWith('modal_buylock_')) {
                const k = interaction.customId.replace('modal_buylock_', '');
                const l = SHOP_LOCKS[k];
                if (!l) return interaction.reply({ content: '❌ Lock invalid.', ephemeral: true });
                const tc = l.price * qty;
                if (ud.gems < tc) return interaction.reply({ content: `❌ Gems kurang! Butuh ${tc.toLocaleString()}`, ephemeral: true });
                ud.gems -= tc;
                ud.locks[k] += qty;
                db.saveUser(ud);
                resp = `✅ Beli **l.namex{qty.toLocaleString()}**\n> WL ${formatWL(ud.locks.wl)} | DL ${formatWL(ud.locks.dl)} | BGL ${formatWL(ud.locks.bgl)} | BGLB ${formatWL(ud.locks.bglb)}`;
            }

            db.saveUser(ud);
            const msg = activeMessages.get(userId);
            if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
            refreshAllLeaderboards();
            return interaction.reply({ content: resp, ephemeral: true });
        }

        // ==========================================
        // BUTTONS
        // ==========================================
        if (!interaction.isButton()) return;
        const id = interaction.customId;
        const userId = interaction.user.id;

        if (id.startsWith('afk_online_')) {
            const tu = id.replace('afk_online_', '');
            if (interaction.user.id !== tu) return interaction.reply({ content: '❌ Tombol ini bukan untuk kamu.', ephemeral: true });
            const t = afkCheckTimers.get(userId);
            if (t && t.timeoutTimer) clearTimeout(t.timeoutTimer);
            const cfg = db.getAfkCheckConfig(interaction.guildId);
            try {
                await interaction.update({
                    embeds: [new EmbedBuilder().setColor('#57F287').setTitle('✅ Online')
                        .setDescription(`Terima kasih <@${userId}>!\n\n> Auto Farm tetap jalan.\n> Cek berikutnya **${cfg.intervalMinutes} menit**.`).setTimestamp()],
                    components: []
                });
            } catch {}
            scheduleAfkCheck(userId, interaction.guildId);
            console.log(`⏰ [AFK] ${userId} konfirmasi online`);
            return;
        }

        let ud = userCache.get(userId);
        if (!ud) { ud = loadUser(userId, interaction.user.username); userCache.set(userId, ud); }
        ud.username = interaction.user.username;

        const isAuto = autoFarmIntervals.has(userId);
        if (ud.autoFarm !== isAuto) ud.autoFarm = isAuto;

        if (id !== 'btn_toggle_auto' && isAuto) {
            stopAutoFarm(userId);
            ud.autoFarm = false;
            ud.lastBreak = 'Auto Farm dimatikan (interaksi lain).';
            db.saveUser(ud);
            console.log(`⏹️ Auto Farm OFF via "id"({interaction.user.username})`);
        }

        let eph = null, err = false;

        // START FARMING
        if (id === 'start_farming') {
            if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
            await interaction.deferReply({ ephemeral: true });
            const cfg = db.getGuildConfig(interaction.guildId);
            if (!cfg) return interaction.editReply({ content: '❌ Server belum di-setup. Jalankan `/setup`.' });

            let thread = null;
            const dbt = db.getUserThread(interaction.guildId, userId);
            if (dbt) {
                try {
                    thread = await interaction.guild.channels.fetch(dbt.threadId);
                    if (thread && thread.parentId === interaction.channelId) {
                        if (thread.archived) try { await thread.setArchived(false); } catch {}
                        userThreads.set(userId, thread.id);
                    } else {
                        thread = null;
                        db.removeUserThread(interaction.guildId, userId);
                        userThreads.delete(userId);
                    }
                } catch {
                    thread = null;
                    db.removeUserThread(interaction.guildId, userId);
                    userThreads.delete(userId);
                }
            }

            if (!thread) {
                const cid = userThreads.get(userId);
                if (cid) {
                    try {
                        thread = await interaction.guild.channels.fetch(cid);
                        if (thread && thread.parentId === interaction.channelId) {
                            if (thread.archived) try { await thread.setArchived(false); } catch {}
                            db.setUserThread(interaction.guildId, userId, thread.id, interaction.channelId);
                        } else { thread = null; userThreads.delete(userId); }
                    } catch { thread = null; userThreads.delete(userId); }
                }
            }

            if (thread) {
                const em = activeMessages.get(userId);
                let valid = false;
                if (em && em.channelId === thread.id) {
                    try {
                        await em.fetch();
                        ud.currentView = 'main';
                        await em.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                        valid = true;
                    } catch { activeMessages.delete(userId); }
                } else if (em) { await invalidateOldPanel(userId, 'Panel lama dipindah ke thread baru.'); }
                if (!valid) {
                    ud.currentView = 'main';
                    const m = await thread.send({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                    activeMessages.set(userId, m);
                }
                return interaction.editReply({ content: `✅ Kamu sudah punya thread: ${thread}` });
            }

            try {
                thread = await interaction.channel.threads.create({
                    name: `🌱 ${interaction.user.username}`, autoArchiveDuration: 1440,
                    type: ChannelType.PrivateThread, reason: `Farming ${interaction.user.username}`
                });
                try { await thread.members.add(userId); } catch {}
            } catch (e) {
                try {
                    thread = await interaction.channel.threads.create({
                        name: `🌱 ${interaction.user.username}`, autoArchiveDuration: 1440,
                        type: ChannelType.PublicThread, reason: `Farming ${interaction.user.username}`
                    });
                } catch (e2) { return interaction.editReply({ content: `❌ Gagal buat thread: ${e2.message}` }); }
            }

            userThreads.set(userId, thread.id);
            db.setUserThread(interaction.guildId, userId, thread.id, interaction.channelId);
            await invalidateOldPanel(userId, 'Panel lama dipindah ke thread baru.');
            ud.currentView = 'main';
            const m = await thread.send({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
            activeMessages.set(userId, m);
            return interaction.editReply({ content: `✅ Thread dibuat: ${thread}` });
        }

        // GACHA ROLL
        if (id === 'gacha_roll_1' || id === 'gacha_roll_10') {
            if (!lockUser(userId, 2000)) {
                return interaction.reply({ content: '⏳ Tunggu sebentar...', ephemeral: true }).catch(() => {});
            }

            const rolls = id === 'gacha_roll_1' ? 1 : 10;
            const gbcOwned = ud.items.gbc || 0;

            if (gbcOwned < rolls) {
                return interaction.reply({ content: `❌ GBC kurang! Butuh **${rolls}** EMOJI.gbc,kamupunya**{gbcOwned}**`, ephemeral: true });
            }

            ud.items.gbc -= rolls;
            const results = [];
            for (let i = 0; i < rolls; i++) results.push(rollGacha(ud));
            db.saveUser(ud);

            const lines = results.map((r, i) => {
                const mark = r.type === 'gang' ? '🎉 ' : (r.type === 'ancesred' ? '🔴 ' : '');
                return `**${i + 1}.** mark{r.label}\n> ${r.extra}`;
            });

            const embed = new EmbedBuilder()
                .setColor(rolls === 10 ? '#F1C40F' : '#9B59B6')
                .setTitle(rolls === 10 ? '🎰 Gacha 10x Roll!' : '🎰 Gacha Roll!')
                .setDescription(lines.join('\n\n'))
                .addFields({
                    name: '📊 Ringkasan',
                    value: `${EMOJI.gbc} **GBC tersisa:** ${ud.items.gbc}\n🎯 **Total roll:** ${ud.totalGachaRolls}\n${GANG.emoji} **Gang kamu:** ud.items.gang||0/{GANG.maxCount}`
                })
                .setFooter({ text: `Roll dari ${interaction.user.username}` })
                .setTimestamp();

            try {
                await interaction.update({ embeds: [embed], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
            } catch {}

            setTimeout(async () => {
                try {
                    ud.currentView = 'gacha';
                    const m = activeMessages.get(userId);
                    if (m) await m.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                } catch {}
            }, 5000);

            refreshAllLeaderboards();
            return;
        }

        // UPGRADE ANCES RED
        if (id === 'upgrade_ancesred') {
            if (!lockUser(userId, 2000)) {
                return interaction.reply({ content: '⏳ Tunggu sebentar...', ephemeral: true }).catch(() => {});
            }

            const currentLevel = ud.items.ancesRedLevel || 0;
            if (currentLevel >= ANCES_RED.maxLevel) return interaction.reply({ content: `❌ Ances Red sudah MAX!`, ephemeral: true });

            const cost = ANCES_RED.costs[currentLevel];
            let canAfford = true;
            let missing = '';
            if (cost.gems > 0 && ud.gems < cost.gems) { canAfford = false; missing = `Butuh **${cost.gems.toLocaleString()}** ${EMOJI.gems}`; }
            if (cost.bgl > 0 && ud.locks.bgl < cost.bgl) { canAfford = false; missing = `Butuh **${cost.bgl}** ${EMOJI.bgl}`; }
            if (!canAfford) return interaction.reply({ content: `❌ Tidak cukup! ${missing}`, ephemeral: true });

            if (cost.gems > 0) ud.gems -= cost.gems;
            if (cost.bgl > 0) ud.locks.bgl -= cost.bgl;
            ud.items.ancesRedLevel = currentLevel + 1;
            db.saveUser(ud);

            const newBonus = ANCES_RED.bonuses[ud.items.ancesRedLevel];
            const totalBoost = getGemMultiplier(ud);
            const boostPercent = Math.round((totalBoost - 1) * 100);

            await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
            activeMessages.set(userId, interaction.message);

            return interaction.followUp({
                content: `✅ ${ANCES_RED.emoji} **Ances Red** upgraded!\n> Lv.**${currentLevel}** → Lv.**${ud.items.ancesRedLevel}**\n> Bonus sekarang: **+${newBonus}%** Gems\n> Total Boost: **+${boostPercent}%** Gems`,
                ephemeral: true
            });
        }

        // SHOP BLOCKS PAGE
        if (id === 'shop_blocks_page_low') { ud._shopBlocksPage = 'low'; ud.currentView = 'shop_blocks'; await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); activeMessages.set(userId, interaction.message); return; }
        if (id === 'shop_blocks_page_pog') { ud._shopBlocksPage = 'pog'; ud.currentView = 'shop_blocks'; await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); activeMessages.set(userId, interaction.message); return; }
        if (id === 'shop_blocks_page_high') { ud._shopBlocksPage = 'high'; ud.currentView = 'shop_blocks'; await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); activeMessages.set(userId, interaction.message); return; }

        // CHANGE BLOCK PAGE
        if (id === 'change_block_page_low') { ud._changeBlockPage = 'low'; ud.currentView = 'change_block'; await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); activeMessages.set(userId, interaction.message); return; }
        if (id === 'change_block_page_pog') { ud._changeBlockPage = 'pog'; ud.currentView = 'change_block'; await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); activeMessages.set(userId, interaction.message); return; }
        if (id === 'change_block_page_high') { ud._changeBlockPage = 'high'; ud.currentView = 'change_block'; await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); activeMessages.set(userId, interaction.message); return; }

        // CUSTOM BUY
        if (id.startsWith('customblock_')) {
            const k = id.replace('customblock_', '');
            const b = SHOP_BLOCKS[k];
            if (!b) return interaction.reply({ content: '❌ Block invalid.', ephemeral: true });
            if (isUnlimited(k)) return interaction.reply({ content: `♾️ Unlimited!`, ephemeral: true });
            return interaction.showModal(buildBuyModal(`Beli ${b.name}`, `modal_buyblock_${k}`, `Harga: ${formatWL(b.priceWL)} WL/block`));
        }
        if (id.startsWith('customlock_')) {
            const k = id.replace('customlock_', '');
            const l = SHOP_LOCKS[k];
            if (!l) return interaction.reply({ content: '❌ Lock invalid.', ephemeral: true });
            return interaction.showModal(buildBuyModal(`Beli ${l.name}`, `modal_buylock_${k}`, `Harga: ${l.price.toLocaleString()}/lock`));
        }

        // NAVIGASI
        if (id === 'nav_main') ud.currentView = 'main';
        else if (id === 'nav_shop') ud.currentView = 'shop';
        else if (id === 'nav_shop_tools') ud.currentView = 'shop_tools';
        else if (id === 'nav_shop_blocks') { ud.currentView = 'shop_blocks'; if (!ud._shopBlocksPage) ud._shopBlocksPage = 'low'; }
        else if (id === 'nav_shop_items') ud.currentView = 'shop_items';
        else if (id === 'nav_shop_locks') ud.currentView = 'shop_locks';
        else if (id === 'nav_change_block') { ud.currentView = 'change_block'; if (!ud._changeBlockPage) ud._changeBlockPage = 'low'; }
        else if (id === 'nav_skills') ud.currentView = 'skills';
        else if (id === 'nav_items') ud.currentView = 'items';
        else if (id === 'nav_tools') ud.currentView = 'tools';
        else if (id === 'nav_profile') ud.currentView = 'profile';
        else if (id === 'nav_event') ud.currentView = 'event';

        // TOGGLE AUTO
        else if (id === 'btn_toggle_auto') {
            const running = autoFarmIntervals.has(userId);
            if (running) {
                stopAutoFarm(userId);
                ud.autoFarm = false;
                ud.lastBreak = 'Auto Farm dimatikan.';
                console.log(`⏹️ Auto Farm OFF (${interaction.user.username})`);
            } else {
                if (getTotalBlocks(ud) <= 0) {
                    eph = '❌ Semua block habis!'; err = true; ud.autoFarm = false;
                } else {
                    ud.autoFarm = true;
                    ud.lastBreak = 'Auto Farm aktif!';
                    startAutoFarm(userId);
                    if (interaction.guildId) scheduleAfkCheck(userId, interaction.guildId);
                    console.log(`▶️ Auto Farm ON (${interaction.user.username})`);
                }
            }
            db.saveUser(ud);
        }

        // MANUAL FARM
        else if (id === 'btn_farm') {
            if (getTotalBlocks(ud) <= 0) { eph = '❌ Semua block habis!'; err = true; }
            else {
                const r = doBreak(ud);
                if (r && !r.switched) ud.lastBreak = formatBreakLog(r, 'Manual');
                db.saveUser(ud);
            }
        }

        // BELI TOOL
        else if (id.startsWith('buy_') && SHOP_TOOLS[id.slice(4)]) {
            if (!lockUser(userId, 1000)) return;
            const k = id.slice(4);
            const t = SHOP_TOOLS[k];
            if (ud.gems < t.price) { eph = `❌ Gems kurang! Butuh ${t.price.toLocaleString()}`; err = true; }
            else if (ud.ownedTools.includes(k)) { eph = `❌ Kamu sudah punya **${t.name}**!`; err = true; }
            else { ud.gems -= t.price; ud.ownedTools.push(k); db.saveUser(ud); eph = `✅ Beli **${t.name}**!`; }
        }

        // SELECT BLOCK
        else if (id.startsWith('selectblock_')) {
            const k = id.slice(12);
            if (!SHOP_BLOCKS[k]) { eph = '❌ Block invalid.'; err = true; }
            else if (!isUnlimited(k) && (ud.blocks[k] || 0) <= 0) { eph = `❌ Tidak punya **${SHOP_BLOCKS[k].name}**!`; err = true; }
            else { ud.selectedBlock = k; db.saveUser(ud); eph = `✅ Pakai **${SHOP_BLOCKS[k].name}**!`; }
        }

        // BELI ITEM
        else if (id.startsWith('buy_') && SHOP_ITEMS[id.slice(4)]) {
            if (!lockUser(userId, 1000)) return;
            const k = id.slice(4);
            const i = SHOP_ITEMS[k];
            if (ud.gems < i.price) { eph = `❌ Gems kurang! Butuh ${i.price.toLocaleString()}`; err = true; }
            else {
                ud.gems -= i.price;
                if (!ud.items[k]) ud.items[k] = 0;
                ud.items[k]++;
                db.saveUser(ud);
                eph = `✅ Beli i.emoji**{i.name}** ×1!`;
            }
        }

        // PAKAI ITEM
        else if (id.startsWith('use_')) {
            if (!lockUser(userId, 1000)) return;
            const k = id.slice(4);
            const item = SHOP_ITEMS[k];
            if (!item) { eph = '❌ Item invalid.'; err = true; }
            else if (!ud.items[k] || ud.items[k] <= 0) { eph = `❌ Tidak punya item.emoji**{item.name}**!`; err = true; }
            else {
                ud.items[k]--;
                if (k === 'arroz') { ud.activeBuffs.arroz = Date.now() + (item.duration * 1000); eph = `✅ 🍗 **Arroz** aktif! x2 Gems selama ${item.duration}s`; }
                else if (k === 'clover') { ud.activeBuffs.clover = Date.now() + (item.duration * 1000); eph = `✅ 🍀 **Clover** aktif! x2 XP selama ${item.duration}s`; }
                else if (k === 'timewarp') { ud.activeBuffs.timewarp = Date.now() + (item.duration * 1000); eph = `✅ ⏳ **Time Warp** aktif! Auto Farm 2x lebih cepat ${item.duration}s\n> ⚡ Interval: **${(getAutoInterval(ud) / 1000).toFixed(1)}s**`; }
                else if (k === 'gempack') { ud.gems += item.amount; eph = `✅ 💎 **Gem Pack** dibuka! **+${item.amount.toLocaleString()} Gems**`; }
                else if (k === 'xpscroll') { const bl = ud.level; ud.xp += item.amount; const lv = checkLevelUp(ud); eph = `✅ 📜 **XP Scroll** dibuka! **+${item.amount.toLocaleString()} XP**`; if (lv > 0) eph += `\n> 🎉 **LEVEL UP! ${bl} → ud.level**(+{lv} SP)`; }
                else if (k === 'bomb') { ud.blocks.pog = (ud.blocks.pog || 0) + item.amount; eph = `✅ 💣 **Block Bomb** meledak! **+${item.amount} POG**`; }
                if (item.category === 'instant') ud.currentView = 'main';
                db.saveUser(ud);
            }
        }

        // EQUIP TOOL
        else if (id.startsWith('equip_')) {
            const k = id.slice(6);
            if (!ud.ownedTools.includes(k)) { eph = '❌ Tidak punya tool ini.'; err = true; }
            else { ud.equippedTool = k; db.saveUser(ud); eph = `✅ **${SHOP_TOOLS[k].name}** di-equip!`; }
        }
        else if (id === 'unequip_tool') {
            ud.equippedTool = null;
            db.saveUser(ud);
            eph = '✅ Tool di-unequip.';
        }

        // UPGRADE SKILL
        else if (id.startsWith('up_') && id !== 'upgrade_ancesred') {
            if (!lockUser(userId, 1000)) return;
            const k = id.slice(3);
            const s = SKILLS[k];
            if (!s) return;
            const lvl = ud.skills[k];
            const cost = getSkillUpgradeCost(lvl);
            if (lvl >= s.maxLevel) { eph = `⚠️ **${s.name}** sudah MAX!`; err = true; }
            else if (ud.skillPoints < cost) { eph = `❌ SP kurang! Butuh **cost**,punya**{ud.skillPoints}**.`; err = true; }
            else {
                ud.skillPoints -= cost;
                ud.skills[k]++;
                db.saveUser(ud);
                eph = `✅ s.emoji**{s.name}** → Lv.**ud.skills[k]/{s.maxLevel}** (-${cost} SP)`;
                if (k === 'mining_speed') eph += `\n> ⏱️ Interval: **${(getAutoInterval(ud) / 1000).toFixed(1)}s**`;
            }
        }

        if (ud.autoFarm === false && autoFarmIntervals.has(userId)) stopAutoFarm(userId);

        if (!err) {
            try {
                await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
            } catch {}
        }

        if (eph) {
            try {
                if (err) await interaction.reply({ content: eph, ephemeral: true });
                else await interaction.followUp({ content: eph, ephemeral: true });
            } catch {}
        }

        refreshAllLeaderboards();
    } catch (err) {
        if (err?.code === 10062) console.log('⚠️ [10062]');
        else if (err?.code === 40060) console.log('⚠️ [40060]');
        else console.error('❌ Interaction error:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);


