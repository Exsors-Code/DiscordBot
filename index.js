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
// ⚙️ KONFIGURASI
// ==========================================
const LEADERBOARD_UPDATE_INTERVAL = 10000;
const EVENT_ROLE_IDS = ['1408101505008926840'];
const EDIT_THROTTLE_MS = 3000;
const INTERACTION_LOCK_MS = 1500;
const MEMBER_CACHE_TTL = 5 * 60 * 1000;

const UNLIMITED_BLOCKS = ['dirt'];
function isUnlimited(k) { return UNLIMITED_BLOCKS.includes(k); }

const BASE_AUTO_INTERVAL = 5000;
const AUTO_INTERVAL_REDUCTION = 200;
const MIN_AUTO_INTERVAL = 3000;

// ===== BARU — Time Warp effect =====
const TIMEWARP_REDUCTION = 0.5; // 50% lebih cepat
const TIMEWARP_DURATION = 60;   // 60 detik

function getAutoInterval(ud) {
    let interval = Math.max(MIN_AUTO_INTERVAL, BASE_AUTO_INTERVAL - ud.skills.mining_speed * AUTO_INTERVAL_REDUCTION);
    // Time Warp: kurangi interval 50% selama aktif
    if (isBuffActive(ud, 'timewarp')) {
        interval = Math.max(500, Math.floor(interval * TIMEWARP_REDUCTION));
    }
    return interval;
}
function getMaxXpForLevel(L) {
    const xp = (17*L*L*L + 2433*L*L + 6328*L - 1908) / 3;
    return Math.max(1, Math.floor(xp));
}
function getSkillUpgradeCost(lvl) { return Math.min(5, 1 + Math.floor(lvl / 2)); }

const SHOP_TOOLS = {
    lss:  { name: 'LSS',  price: 10000,    multiplier: 30,  invBonus: 5000,  blocksPerBreak: 3,  emoji: '🗡️' },
    lray: { name: 'LRAY', price: 100000,   multiplier: 50,  invBonus: 10000, blocksPerBreak: 7,  emoji: '🔫' },
    mray: { name: 'MRAY', price: 1000000,  multiplier: 100, invBonus: 15000, blocksPerBreak: 10, emoji: '⚔️' },
    gray: { name: 'GRAY', price: 10000000, multiplier: 250, invBonus: 20000, blocksPerBreak: 15, emoji: '🌟' }
};
const SHOP_BLOCKS = {
    dirt: { name: 'Dirt',        price: 100,  gemsMin: 1,  gemsMax: 5,   xpMin: 1,  xpMax: 5,   emoji: '🟫' },
    pog:  { name: "Pot O' Gems", price: 5000, gemsMin: 85, gemsMax: 100, xpMin: 85, xpMax: 100, emoji: '🥔' }
};

// ===== ITEM LAMA + ITEM BARU =====
const SHOP_ITEMS = {
    // ===== ITEM LAMA (BUFF) =====
    arroz: {
        name: 'Arroz Con Pollo',
        price: 50000,
        emoji: '🍗',
        category: 'buff',
        duration: 300,
        desc: 'x2 Gems selama 5 menit',
        color: '#E67E22'
    },
    clover: {
        name: 'Lucky Clover',
        price: 250000,
        emoji: '🍀',
        category: 'buff',
        duration: 300,
        desc: 'x2 XP selama 5 menit',
        color: '#2ECC71'
    },
    // ===== ITEM BARU (GROWTOPIA-STYLE) =====
    gempack: {
        name: 'Gem Pack',
        price: 100000,
        emoji: '💎',
        category: 'instant',
        effect: 'gems',
        amount: 150000,          // instant +150k gems
        desc: 'Buka untuk dapat +150.000 Gems instant',
        color: '#3498DB'
    },
    xpscroll: {
        name: 'XP Scroll',
        price: 150000,
        emoji: '📜',
        category: 'instant',
        effect: 'xp',
        amount: 50000,           // instant +50k XP
        desc: 'Buka untuk dapat +50.000 XP instant',
        color: '#9B59B6'
    },
    bomb: {
        name: 'Block Bomb',
        price: 25000,
        emoji: '💣',
        category: 'instant',
        effect: 'blocks',
        amount: 100,             // +100 POG
        desc: 'Meledakkan 100 Pot O\' Gems ke inventory',
        color: '#E74C3C'
    },
    timewarp: {
        name: 'Time Warp',
        price: 500000,
        emoji: '⏳',
        category: 'buff',
        duration: TIMEWARP_DURATION,
        desc: 'Auto Farm 2x lebih cepat selama 60 detik',
        color: '#F1C40F'
    }
};

const SHOP_LOCKS = {
    wl:  { name: 'WL',  emoji: '🔹', price: 2000 },
    dl:  { name: 'DL',  emoji: '🔸', price: 200000 },
    bgl: { name: 'BGL', emoji: '🔶', price: 20000000 }
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
function getTotalBlocks(ud) { return ud.blocks.dirt + ud.blocks.pog; }

function getTotalLockValue(ud) {
    return (ud.locks.wl * 1) + (ud.locks.dl * 100) + (ud.locks.bgl * 10000) + (ud.locks.bglb * 1000000);
}

function isBuffActive(ud, key) { return Date.now() < ud.activeBuffs[key]; }

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
    // Pastikan semua key item ada
    if (!ud.items.gempack) ud.items.gempack = 0;
    if (!ud.items.xpscroll) ud.items.xpscroll = 0;
    if (!ud.items.bomb) ud.items.bomb = 0;
    if (!ud.items.timewarp) ud.items.timewarp = 0;
    if (!ud.activeBuffs.timewarp) ud.activeBuffs.timewarp = 0;
    return ud;
}

function formatStock(k, a) {
    return isUnlimited(k) ? '**∞ (Unlimited)**' : `**${a.toLocaleString()}**`;
}

// ==========================================
// 🎨 MAIN PANEL EMBED
// ==========================================
function mainEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const sel = SHOP_BLOCKS[ud.selectedBlock];
    const interval = getAutoInterval(ud);
    const ev = ud.event;

    // XP Progress bar
    const xpPercent = ud.maxXp > 0 ? ud.xp / ud.maxXp : 0;
    const barLength = 15;
    const filled = Math.round(xpPercent * barLength);
    const xpBar = '█'.repeat(Math.min(filled, barLength)) + '░'.repeat(Math.max(barLength - filled, 0));

    // Auto farm status
    const autoIcon = ud.autoFarm ? '▶️' : '⏸️';
    const twActive = isBuffActive(ud, 'timewarp');
    const autoText = ud.autoFarm ? `**ON** · ${(interval / 1000).toFixed(1)}s${twActive ? ' ⚡' : ''}` : '**OFF**';
    const statusIcon = ud.autoFarm ? '🟢' : '⚪';

    // Buff
    const buffs = [];
    if (isBuffActive(ud, 'arroz')) buffs.push(`🍗 Arroz · ${Math.ceil((ud.activeBuffs.arroz - Date.now()) / 1000)}s`);
    if (isBuffActive(ud, 'clover')) buffs.push(`🍀 Clover · ${Math.ceil((ud.activeBuffs.clover - Date.now()) / 1000)}s`);
    if (isBuffActive(ud, 'timewarp')) buffs.push(`⏳ Time Warp · ${Math.ceil((ud.activeBuffs.timewarp - Date.now()) / 1000)}s ⚡`);
    const buffText = buffs.length ? buffs.join('  ·  ') : '*Tidak ada buff aktif*';

    // Tool
    const toolText = tool
        ? `${tool.emoji} **${tool.name}** x${tool.multiplier}  ·  ${tool.blocksPerBreak} far`
        : '⚪ **Tidak ada** · 1 far';

    // Stock block
    const stockText = isUnlimited(ud.selectedBlock)
        ? '∞'
        : ud.blocks[ud.selectedBlock].toLocaleString();

    return new EmbedBuilder()
        .setColor(ud.autoFarm ? '#57F287' : '#2b2d31')
        .setAuthor({ name: `🌾 Farming Panel — ${ud.username}` })
        .setDescription(
            `**Level ${ud.level}**  ·  ⭐ **${ud.skillPoints} SP**\n` +
            `\`${xpBar}\`  **${Math.floor(xpPercent * 100)}%**\n` +
            `📈 ${ud.xp.toLocaleString()} / ${ud.maxXp.toLocaleString()} XP`
        )
        .addFields(
            {
                name: '📊  Status',
                value:
                    `🎉 **Event**  ·  ${ev.name}\n` +
                    `💰 **Gems**  ·  ${Math.floor(ud.gems).toLocaleString()}\n` +
                    `⛏️ **Mining**  ·  ${sel.emoji} ${sel.name} (${stockText})`,
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
// 🎨 MAIN BUTTONS — tanpa Event
// ==========================================
function mainButtons(ud) {
    // Baris 1: 3 tombol utama
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_farm')
            .setLabel('Farm Manual')
            .setEmoji('🌾')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ud.autoFarm),
        new ButtonBuilder()
            .setCustomId('btn_toggle_auto')
            .setLabel(ud.autoFarm ? 'Stop Auto' : 'Start Auto')
            .setEmoji(ud.autoFarm ? '⏹️' : '▶️')
            .setStyle(ud.autoFarm ? ButtonStyle.Danger : ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('nav_change_block')
            .setLabel('Ganti Block')
            .setEmoji('⛏️')
            .setStyle(ButtonStyle.Secondary)
    );

    // Baris 2: dropdown untuk menu lainnya (tanpa Event)
    const row2 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('main_menu_select')
            .setPlaceholder('📋  Buka menu lainnya...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Shop')
                    .setDescription('Beli tools, blocks, items, dan locks')
                    .setValue('menu_shop')
                    .setEmoji('🛒'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Items')
                    .setDescription('Pakai buff & item instant')
                    .setValue('menu_items')
                    .setEmoji('🎒'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Profile')
                    .setDescription('Lihat statistik lengkap kamu')
                    .setValue('menu_profile')
                    .setEmoji('👤'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Skills')
                    .setDescription('Upgrade skill pakai SP')
                    .setValue('menu_skills')
                    .setEmoji('⭐'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Tools')
                    .setDescription('Equip / ganti tool aktif')
                    .setValue('menu_tools')
                    .setEmoji('🛠️')
            )
    );

    return [row1, row2];
}

// ==========================================
// EVENT EMBED (masih dipakai untuk halaman event)
// ==========================================
function eventEmbed(ud) {
    const ev = ud.event;
    return new EmbedBuilder().setColor('#E91E63').setTitle('🎉 Event Aktif')
        .setDescription(`### **${ev.name}**\n\n> 💰 **Gems Multiplier**: **x${ev.gemsMult}**\n> 🟫 **Blocks Multiplier**: **x${ev.blocksMult}**\n> 📈 XP juga kena multiplier Gems\n\n*Gunakan \`/customevent\` untuk mengubah.*`);
}
function eventButtons() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
}

// ==========================================
// SHOP EMBEDS
// ==========================================
function shopMainEmbed(ud) {
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop').setDescription('Pilih kategori:')
        .addFields(
            { name: '🛠️ Tools', value: 'Tool boost farming', inline: true },
            { name: '🟫 Blocks', value: 'Beli block', inline: true },
            { name: '🎒 Items', value: 'Buff & instant item', inline: true },
            { name: '🔒 Locks', value: 'Beli lock', inline: true }
        ).setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
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
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopToolsEmbed(ud) {
    const l = ['**🛠️ TOOLS**'];
    for (const k in SHOP_TOOLS) {
        const t = SHOP_TOOLS[k];
        const o = ud.ownedTools.includes(k) ? ' ✅' : '';
        l.push(`${t.emoji} **${t.name}**${o} — ${t.price.toLocaleString()} 💰\n> x${t.multiplier} Gems | ⛏️ **${t.blocksPerBreak} far**`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — Tools')
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopToolsButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_lss').setLabel('LSS').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_lray').setLabel('LRAY').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_mray').setLabel('MRAY').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_gray').setLabel('GRAY').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopBlocksEmbed(ud) {
    const l = ['**BELI BLOCK**', ''];
    for (const k in SHOP_BLOCKS) {
        const b = SHOP_BLOCKS[k];
        const u = isUnlimited(k) ? ' ♾️ **(Unlimited)**' : '';
        l.push(`${b.emoji} **${b.name}**${u}\n> Reward: **${b.gemsMin}-${b.gemsMax}** | **${b.xpMin}-${b.xpMax} XP**\n> 📦 Stok: ${formatStock(k, ud.blocks[k])}`);
    }
    return new EmbedBuilder().setColor('#8B4513').setTitle('🛒 Shop — Blocks')
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopBlocksButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('customblock_pog').setLabel('🥔 Beli POG').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function changeBlockEmbed(ud) {
    const l = ['**⛏️ Ganti Block Aktif**', ''];
    for (const k in SHOP_BLOCKS) {
        const b = SHOP_BLOCKS[k];
        const s = ud.selectedBlock === k ? ' **[AKTIF]**' : '';
        l.push(`${b.emoji} **${b.name}**${s}\n> Reward: **${b.gemsMin}-${b.gemsMax}** | **${b.xpMin}-${b.xpMax} XP**\n> Stok: ${formatStock(k, ud.blocks[k])}`);
    }
    return new EmbedBuilder().setColor('#8B4513').setTitle('⛏️ Change Block').setDescription(l.join('\n\n'));
}
function changeBlockButtons(ud) {
    const d = isUnlimited('dirt') ? '∞' : ud.blocks.dirt.toLocaleString();
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('selectblock_dirt').setLabel(`🟫 Dirt (${d})`)
                .setStyle(ud.selectedBlock === 'dirt' ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(ud.selectedBlock === 'dirt'),
            new ButtonBuilder().setCustomId('selectblock_pog').setLabel(`🥔 POG (${ud.blocks.pog.toLocaleString()})`)
                .setStyle(ud.selectedBlock === 'pog' ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(ud.selectedBlock === 'pog' || ud.blocks.pog <= 0)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopItemsEmbed(ud) {
    const buffs = [];
    const instant = [];

    for (const k in SHOP_ITEMS) {
        const i = SHOP_ITEMS[k];
        const line = `${i.emoji} **${i.name}** — ${i.price.toLocaleString()} 💰\n> ${i.desc}\n> 📦 Dimiliki: **${ud.items[k] || 0}**`;
        if (i.category === 'buff') buffs.push(line);
        else instant.push(line);
    }

    return new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🛒 Shop — Items')
        .setDescription(
            `**✨ BUFF ITEM** *(efek sementara)*\n\n${buffs.join('\n\n')}\n\n` +
            `**⚡ INSTANT ITEM** *(efek langsung)*\n\n${instant.join('\n\n')}`
        )
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
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function shopLocksEmbed(ud) {
    const l = ['**BELI LOCK**', ''];
    for (const k in SHOP_LOCKS) {
        const x = SHOP_LOCKS[k];
        l.push(`${x.emoji} **${x.name}** — ${x.price.toLocaleString()} 💰/lock\n> 📦 Kamu punya: **${ud.locks[k].toLocaleString()}**`);
    }
    l.push(`\n**Auto-convert:** 100 WL → 1 DL | 100 DL → 1 BGL | 100 BGL → 1 BGLB`);
    return new EmbedBuilder().setColor('#F1C40F').setTitle('🛒 Shop — Locks')
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopLocksButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('customlock_wl').setLabel('🔹 Beli WL').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customlock_dl').setLabel('🔸 Beli DL').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customlock_bgl').setLabel('🔶 Beli BGL').setStyle(ButtonStyle.Success)
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
                return `${s.emoji} **${s.name}** — ${isMax ? '**MAX** ✅' : `Lv. ${lvl}/${s.maxLevel} • **${cost} SP**`}`;
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
// ITEMS (INVENTORY) — BARU
// ==========================================
function itemsEmbed(ud) {
    const lines = [];

    // Buff items
    const buffs = [];
    if (ud.items.arroz > 0) buffs.push(`🍗 **Arroz Con Pollo** ×${ud.items.arroz}\n> x2 Gems selama 5 menit`);
    if (ud.items.clover > 0) buffs.push(`🍀 **Lucky Clover** ×${ud.items.clover}\n> x2 XP selama 5 menit`);
    if (ud.items.timewarp > 0) buffs.push(`⏳ **Time Warp** ×${ud.items.timewarp}\n> Auto Farm 2x lebih cepat selama 60 detik`);

    // Instant items
    const instants = [];
    if (ud.items.gempack > 0) instants.push(`💎 **Gem Pack** ×${ud.items.gempack}\n> +150.000 Gems instant`);
    if (ud.items.xpscroll > 0) instants.push(`📜 **XP Scroll** ×${ud.items.xpscroll}\n> +50.000 XP instant`);
    if (ud.items.bomb > 0) instants.push(`💣 **Block Bomb** ×${ud.items.bomb}\n> +100 Pot O' Gems ke inventory`);

    if (buffs.length === 0 && instants.length === 0) {
        return new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('🎒 Items')
            .setDescription('*Inventory kosong.*\n\n> Beli item di **🛒 Shop → 🎒 Items**');
    }

    let desc = '';
    if (buffs.length > 0) desc += `**✨ BUFF ITEM**\n\n${buffs.join('\n\n')}\n\n`;
    if (instants.length > 0) desc += `**⚡ INSTANT ITEM**\n\n${instants.join('\n\n')}`;

    return new EmbedBuilder()
        .setColor('#E67E22')
        .setTitle('🎒 Items')
        .setDescription(desc);
}

function itemsButtons(ud) {
    const rows = [];

    // Baris 1: Buff items
    const buffRow = new ActionRowBuilder();
    if (ud.items.arroz > 0) buffRow.addComponents(
        new ButtonBuilder().setCustomId('use_arroz').setLabel(`🍗 Arroz (${ud.items.arroz})`).setStyle(ButtonStyle.Primary)
    );
    if (ud.items.clover > 0) buffRow.addComponents(
        new ButtonBuilder().setCustomId('use_clover').setLabel(`🍀 Clover (${ud.items.clover})`).setStyle(ButtonStyle.Primary)
    );
    if (ud.items.timewarp > 0) buffRow.addComponents(
        new ButtonBuilder().setCustomId('use_timewarp').setLabel(`⏳ Time Warp (${ud.items.timewarp})`).setStyle(ButtonStyle.Primary)
    );
    if (buffRow.components.length > 0) rows.push(buffRow);

    // Baris 2: Instant items
    const instRow = new ActionRowBuilder();
    if (ud.items.gempack > 0) instRow.addComponents(
        new ButtonBuilder().setCustomId('use_gempack').setLabel(`💎 Gem Pack (${ud.items.gempack})`).setStyle(ButtonStyle.Success)
    );
    if (ud.items.xpscroll > 0) instRow.addComponents(
        new ButtonBuilder().setCustomId('use_xpscroll').setLabel(`📜 XP Scroll (${ud.items.xpscroll})`).setStyle(ButtonStyle.Success)
    );
    if (ud.items.bomb > 0) instRow.addComponents(
        new ButtonBuilder().setCustomId('use_bomb').setLabel(`💣 Block Bomb (${ud.items.bomb})`).setStyle(ButtonStyle.Success)
    );
    if (instRow.components.length > 0) rows.push(instRow);

    // Baris terakhir: main menu
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));

    return rows;
}

// ==========================================
// TOOLS
// ==========================================
function toolsEmbed(ud) {
    const t = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    return new EmbedBuilder().setColor('#3498DB').setTitle('🛠️ Tools')
        .setDescription((t ? `**Equipped:** ${t.emoji} **${t.name} x${t.multiplier}**` : '*Tidak ada tool*') + `\n\n*Tools multiply Gems & XP.*`);
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
        opts.push(new StringSelectMenuOptionBuilder()
            .setLabel('Unequip').setValue('unequip')
            .setDescription('Lepas (x1)').setDefault(!ud.equippedTool));
        r.push(new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('select_tool').setPlaceholder('Pilih tool').addOptions(opts)
        ));
    }
    r.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));
    return r;
}

// ==========================================
// PROFILE
// ==========================================
function profileEmbed(ud) {
    const t = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const tv = getTotalLockValue(ud);
    return new EmbedBuilder().setColor('#F1C40F').setTitle(`👤 Profile — ${ud.username}`)
        .addFields(
            { name: '🏆 Level', value: `${ud.level}`, inline: true },
            { name: '🛠️ Tool', value: t ? `${t.emoji} ${t.name}` : 'Tidak ada', inline: true },
            { name: '💰 Gems', value: Math.floor(ud.gems).toLocaleString(), inline: true },
            { name: '🥔 POG', value: ud.blocks.pog.toLocaleString(), inline: true },
            { name: '⭐ SP', value: `${ud.skillPoints}`, inline: true },
            { name: '🔒 Locks', value:
                `🔹 **WL**: ${ud.locks.wl.toLocaleString()}\n` +
                `🔸 **DL**: ${ud.locks.dl.toLocaleString()}\n` +
                `🔶 **BGL**: ${ud.locks.bgl.toLocaleString()}\n` +
                `🌟 **BGLB**: ${ud.locks.bglb.toLocaleString()}\n` +
                `**Total: ${tv.toLocaleString()} WL**`, inline: false }
        );
}
function profileButtons() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
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
        if (e.locks.wl > 0) p.push(`🔹 ${e.locks.wl}`);
        if (e.locks.dl > 0) p.push(`🔸 ${e.locks.dl}`);
        if (e.locks.bgl > 0) p.push(`🔶 ${e.locks.bgl}`);
        if (e.locks.bglb > 0) p.push(`🌟 ${e.locks.bglb}`);
        return `${r} **${e.username}** (Lv.${e.level})\n> ${p.join(' | ')}\n> 💰 **${e.totalValue.toLocaleString()} WL**`;
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
        case 'shop_blocks': return shopBlocksEmbed(ud);
        case 'shop_items': return shopItemsEmbed(ud);
        case 'shop_locks': return shopLocksEmbed(ud);
        case 'change_block': return changeBlockEmbed(ud);
        case 'skills': return skillsEmbed(ud);
        case 'items': return itemsEmbed(ud);
        case 'tools': return toolsEmbed(ud);
        case 'profile': return profileEmbed(ud);
        case 'event': return eventEmbed(ud);
        default: return mainEmbed(ud);
    }
}
function renderButtons(ud) {
    switch(ud.currentView) {
        case 'shop': return shopMainButtons();
        case 'shop_tools': return shopToolsButtons();
        case 'shop_blocks': return shopBlocksButtons();
        case 'shop_items': return shopItemsButtons();
        case 'shop_locks': return shopLocksButtons();
        case 'change_block': return changeBlockButtons(ud);
        case 'skills': return skillsButtons(ud);
        case 'items': return itemsButtons(ud);
        case 'tools': return toolsButtons(ud);
        case 'profile': return profileButtons();
        case 'event': return eventButtons();
        default: return mainButtons(ud);
    }
}

// ==========================================
// BREAK LOGIC
// ==========================================
function doBreak(ud) {
    const bt = ud.selectedBlock;
    const bd = SHOP_BLOCKS[bt];
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const far = tool ? tool.blocksPerBreak : 1;
    const ev = ud.event;
    const unl = isUnlimited(bt);

    if (!unl) {
        if (ud.blocks[bt] <= 0) {
            const fb = Object.keys(SHOP_BLOCKS).find(k => k !== bt && (isUnlimited(k) || ud.blocks[k] > 0));
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
    const brk = unl ? far : Math.min(far, ud.blocks[bt]);
    if (!unl) ud.blocks[bt] -= brk;
    const tm = tool ? tool.multiplier : 1;
    const gsm = 1 + (ud.skills.gem_hunter * 0.10);
    const gbm = isBuffActive(ud, 'arroz') ? 2 : 1;
    let tg = 0;
    for (let i = 0; i < brk; i++) {
        const bg = Math.floor(Math.random() * (bd.gemsMax - bd.gemsMin + 1)) + bd.gemsMin;
        let g = Math.floor(bg * tm * gsm * gbm * ev.gemsMult);
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
    let m = `${prefix} [${bd.name}]: -${r.blocksBroken}`;
    if (r.returned > 0) m += ` (+${r.returned})`;
    m += ` → +${r.gemsGained.toLocaleString()} 💰 / +${r.xpGained.toLocaleString()} XP`;
    if (r.levelsGained > 0) m += ` 🎉 **LEVEL UP! +${r.levelsGained} SP**`;
    return m;
}

// ==========================================
// AFK CHECK SYSTEM
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
        .setDescription(
            `Halo <@${userId}>!\n\nKamu masih online?\n\n` +
            `> Klik **✅ Masih Online** dalam **${cfg.timeoutSeconds} detik**.\n` +
            `> Kalau tidak, **Auto Farm dimatikan** & **thread dihapus**.`
        ).setTimestamp();
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`afk_online_${userId}`)
            .setLabel('✅ Masih Online')
            .setStyle(ButtonStyle.Success)
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
            embeds: [new EmbedBuilder()
                .setColor('#ED4245').setTitle('⏰ Timeout')
                .setDescription(`<@${userId}> tidak konfirmasi.\n\n> Auto Farm dimatikan.\n> Thread akan dihapus...`)
                .setTimestamp()],
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
                    let m = `Auto [${bd.name}]: -${ud._acc.blocks}`;
                    if (ud._acc.returned > 0) m += ` (+${ud._acc.returned})`;
                    m += ` → +${ud._acc.gems.toLocaleString()} 💰 / +${ud._acc.xp.toLocaleString()} XP`;
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
                let m = `Auto [${bd.name}]: -${ud._acc.blocks}`;
                if (ud._acc.returned > 0) m += ` (+${ud._acc.returned})`;
                m += ` → +${ud._acc.gems.toLocaleString()} 💰 / +${ud._acc.xp.toLocaleString()} XP`;
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
                embeds: [new EmbedBuilder()
                    .setColor('#ED4245').setTitle('♻️ Akun Direset')
                    .setDescription(
                        `**@${username}** telah direset.\n\n` +
                        `> 🏆 Level: **1**\n> 💰 Gems: **500.000**\n` +
                        `> 🟫 Dirt: **∞**\n> 🥔 POG: **0**\n> 🔒 WL: **1**`
                    ).setTimestamp()],
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
    try {
        await om.edit({
            embeds: [new EmbedBuilder().setColor('#ED4245').setDescription(`❌ ${reason}`)],
            components: []
        });
    } catch {}
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
                    if (t.archived) {
                        try { await t.setArchived(false, 'Cleanup'); await new Promise(r => setTimeout(r, 500)); } catch {}
                    }
                    await t.delete('Cleanup');
                    dt++;
                } catch {
                    try {
                        try { await t.setLocked(true); } catch {}
                        await t.setArchived(true);
                        dt++;
                    } catch {}
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
                .setDescription(
                    'Welcome to **GrowExs**!\n\n' +
                    'Press **Start Farming** below or use `/farming`.\n\n' +
                    '⚠️ Setiap interval tertentu kamu diminta konfirmasi online. Kalau tidak direspon, Auto Farm mati & thread dihapus.'
                ).setFooter({ text: 'GrowExs Farm Guide' });
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