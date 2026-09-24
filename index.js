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

function getAutoInterval(ud) {
    return Math.max(MIN_AUTO_INTERVAL, BASE_AUTO_INTERVAL - ud.skills.mining_speed * AUTO_INTERVAL_REDUCTION);
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
const SHOP_ITEMS = {
    arroz:  { name: 'Arroz Con Pollo', price: 50000,  emoji: '🍗', duration: 300 },
    clover: { name: 'Lucky Clover',    price: 250000, emoji: '🍀', duration: 300 }
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
    return ud;
}

function formatStock(k, a) {
    return isUnlimited(k) ? '**∞ (Unlimited)**' : `**${a.toLocaleString()}**`;
}

// ==========================================
// EMBEDS
// ==========================================
function mainEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const sel = SHOP_BLOCKS[ud.selectedBlock];
    const qty = ud.blocks[ud.selectedBlock];
    const interval = getAutoInterval(ud);
    const auto = ud.autoFarm ? `**ON** • ${(interval / 1000).toFixed(1)}s` : '**OFF**';
    const far = tool ? tool.blocksPerBreak : 1;
    const ev = ud.event;
    const stock = isUnlimited(ud.selectedBlock) ? '∞' : qty.toLocaleString();
    return new EmbedBuilder()
        .setColor(ud.autoFarm ? '#2b2d31' : '#1e1f22')
        .setTitle('🪓 Farming')
        .setDescription(`**@${ud.username}** (Level: ${ud.level})\nXP: **${ud.xp.toLocaleString()}** / ${ud.maxXp.toLocaleString()}`)
        .addFields(
            { name: '🎉 Event', value: `${ev.name} • Gems x${ev.gemsMult} | Blocks x${ev.blocksMult}`, inline: false },
            { name: 'Tool:', value: tool ? `${tool.emoji} ${tool.name} x${tool.multiplier} • ${far} far` : `⚪ Tidak ada • 1 far`, inline: false },
            { name: 'Buff:', value: getActiveBuffText(ud), inline: false },
            { name: '⛏️ Block:', value: `${sel.emoji} ${sel.name} (${stock})`, inline: false },
            { name: 'Inventory:', value: `🟫 ∞ | 🥔 ${ud.blocks.pog.toLocaleString()}`, inline: true },
            { name: '💰 Gems:', value: Math.floor(ud.gems).toLocaleString(), inline: true },
            { name: '⭐ SP:', value: `${ud.skillPoints}`, inline: true },
            { name: 'Auto Farm:', value: auto, inline: false },
            { name: 'Last Break:', value: ud.lastBreak, inline: false }
        );
}

function mainButtons(ud) {
    const r1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_farm').setLabel('🌾 Farm').setStyle(ButtonStyle.Success).setDisabled(ud.autoFarm),
        new ButtonBuilder().setCustomId('nav_change_block').setLabel('⛏️ Change Block').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_event').setLabel('🎉 Event').setStyle(ButtonStyle.Danger)
    );
    const r2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_shop').setLabel('🛒 Shop').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_items').setLabel('🎒 Items').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('nav_profile').setLabel('👤 Profile').setStyle(ButtonStyle.Primary)
    );
    const r3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_skills').setLabel('⭐ Skills').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('nav_tools').setLabel('🛠️ Tools').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_toggle_auto')
            .setLabel(ud.autoFarm ? 'Stop Auto Farm' : 'Start Auto Farm')
            .setStyle(ud.autoFarm ? ButtonStyle.Danger : ButtonStyle.Success)
    );
    return [r1, r2, r3];
}

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

function shopMainEmbed(ud) {
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop').setDescription('Pilih kategori:')
        .addFields(
            { name: '🛠️ Tools', value: 'Tool boost farming', inline: true },
            { name: '🟫 Blocks', value: 'Beli block', inline: true },
            { name: '🎒 Items', value: 'Consumable buff', inline: true },
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
    const l = [];
    for (const k in SHOP_ITEMS) {
        const i = SHOP_ITEMS[k];
        l.push(`${i.emoji} **${i.name}** — ${i.price.toLocaleString()} 💰\n> x2 buff 5 menit\n> Dimiliki: ${ud.items[k]}`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — Items')
        .setDescription(l.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopItemsButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('buy_arroz').setLabel('🍗 Beli Arroz').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('buy_clover').setLabel('🍀 Beli Clover').setStyle(ButtonStyle.Success)
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

function itemsEmbed(ud) {
    return new EmbedBuilder().setColor('#E67E22').setTitle('🎒 Items')
        .setDescription(`🍗 **Arroz** x${ud.items.arroz} → x2 Gems 5m\n\n🍀 **Clover** x${ud.items.clover} → x2 XP 5m`);
}
function itemsButtons(ud) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('use_arroz').setLabel('🍗 Pakai Arroz').setStyle(ButtonStyle.Primary).setDisabled(ud.items.arroz <= 0),
        new ButtonBuilder().setCustomId('use_clover').setLabel('🍀 Pakai Clover').setStyle(ButtonStyle.Primary).setDisabled(ud.items.clover <= 0),
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
}

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

// ==========================================
// BOT READY
// ==========================================
client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} siap!`);
    console.log(`🌐 ${client.guilds.cache.size} server`);
    await db.connectDB();

    // Auto backup tiap 6 jam
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

    // Setup semua guild
    const cfgs = db.getAllGuildConfigs();
    for (const c of cfgs) {
        const g = client.guilds.cache.get(c.guildId);
        if (!g) continue;
        console.log(`🔧 Setup: ${g.name}`);
        await setupGuild(g, c.panelChannelId, c.leaderboardChannelId);
    }

    // Leaderboard refresh loop
    setInterval(refreshAllLeaderboards, LEADERBOARD_UPDATE_INTERVAL);
});

// ==========================================
// EVENT LISTENERS
// ==========================================
client.on('guildCreate', g => console.log(`➕ Join: ${g.name} (${g.id})`));

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

// ===== VOICE STATE UPDATE =====
client.on('voiceStateUpdate', async (oldState, newState) => {
    try { await voiceMod.handleVoiceStateUpdate(client, oldState, newState); } catch (e) {}
});

// ===== CHANNEL DELETE =====
client.on('channelDelete', async (channel) => {
    try { await voiceMod.handleChannelDelete(client, channel); } catch (e) {}
});

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

            // ===== /afkcheck =====
            if (interaction.commandName === 'afkcheck') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const sub = interaction.options.getSubcommand();

                if (sub === 'set') {
                    const interval = interaction.options.getInteger('interval');
                    const timeout = interaction.options.getInteger('timeout');
                    const enabled = interaction.options.getBoolean('enabled');
                    const finalEnabled = enabled === null ? true : enabled;
                    db.setAfkCheckConfig(interaction.guildId, {
                        enabled: finalEnabled,
                        intervalMinutes: interval,
                        timeoutSeconds: timeout
                    });
                    return interaction.editReply({
                        content:
                            `✅ **AFK Check diset!**\n\n` +
                            `> 🔄 Interval: **${interval} menit**\n` +
                            `> ⏱️ Timeout: **${timeout} detik**\n` +
                            `> 🟢 Status: ${finalEnabled ? '**Aktif**' : '**Nonaktif**'}`
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

            // ===== /setup =====
            if (interaction.commandName === 'setup') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const p = interaction.options.getChannel('panel');
                const l = interaction.options.getChannel('leaderboard');
                db.setGuildConfig(interaction.guildId, p.id, l.id);
                await setupGuild(interaction.guild, p.id, l.id);
                return interaction.editReply({ content: `✅ Setup selesai!\n> Panel: ${p}\n> Leaderboard: ${l}` });
            }

            // ===== /unsetup =====
            if (interaction.commandName === 'unsetup') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                db.removeGuildConfig(interaction.guildId);
                guildLeaderboards.delete(interaction.guildId);
                guildMemberCache.delete(interaction.guildId);
                return interaction.reply({ content: `✅ Config dihapus.`, ephemeral: true });
            }

            // ===== /resetplayer =====
            if (interaction.commandName === 'resetplayer') {
                await interaction.deferReply({ ephemeral: true });
                const tu = interaction.options.getUser('player');
                if (!tu) return interaction.editReply({ content: '❌ Player tidak valid.' });
                const m = interaction.guild
                    ? await interaction.guild.members.fetch(userId).catch(() => null)
                    : null;
                if (!isEventManager(m)) {
                    return interaction.editReply({ content: `🔒 Hanya Event Manager / Admin.` });
                }
                const ok = await realtimeResetPlayer(tu);
                if (!ok) return interaction.editReply({ content: `⚠️ Player **${tu.username}** belum pernah main.` });
                return interaction.editReply({ content: `✅ **Reset (REALTIME)!**\n\n> 👤 Player: **${tu.username}**` });
            }

            // ===== /farming =====
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

            // ===== /event =====
            else if (interaction.commandName === 'event') {
                const ud = loadUser(userId, interaction.user.username);
                userCache.set(userId, ud);
                await interaction.reply({ embeds: [eventEmbed(ud)], ephemeral: true });
            }

            // ===== /customevent =====
            else if (interaction.commandName === 'customevent') {
                await interaction.deferReply({ ephemeral: true });
                try {
                    const m = interaction.guild
                        ? await interaction.guild.members.fetch(userId).catch(() => null)
                        : null;
                    if (!isEventManager(m)) {
                        return interaction.editReply({ content: `🔒 Hanya Event Manager / Admin.` });
                    }
                    const ud = loadUser(userId, interaction.user.username);
                    userCache.set(userId, ud);
                    const gm = interaction.options.getInteger('gems');
                    const bm = interaction.options.getInteger('blocks');
                    ud.event.gemsMult = gm;
                    ud.event.blocksMult = bm;
                    ud.event.name = `Custom Event (Gems x${gm}, Blocks x${bm})`;
                    db.saveUser(ud);
                    const msg = activeMessages.get(userId);
                    if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
                    return interaction.editReply({ content: `✅ Event: Gems x${gm} | Blocks x${bm}` });
                } catch (e) {
                    return interaction.editReply({ content: `❌ Gagal: ${e.message}` }).catch(() => {});
                }
            }
            return;
        }

        // ==========================================
        // STRING SELECT MENU
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
                if (v === 'unequip') {
                    ud.equippedTool = null;
                    msg = '✅ Tool di-unequip.';
                } else if (v.startsWith('equip_')) {
                    const k = v.replace('equip_', '');
                    if (ud.ownedTools.includes(k)) {
                        ud.equippedTool = k;
                        msg = `✅ **${SHOP_TOOLS[k].name}** di-equip!`;
                    }
                }
                db.saveUser(ud);
                await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
                try { await interaction.followUp({ content: msg, ephemeral: true }); } catch {}
            }
            return;
        }

        // ==========================================
        // MODAL SUBMIT
        // ==========================================
        if (interaction.isModalSubmit()) {
            const userId = interaction.user.id;
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
                return interaction.reply({
                    content: `❌ Jumlah tidak valid! 1 - ${MAX_CUSTOM_QTY.toLocaleString()}.`,
                    ephemeral: true
                });
            }

            let resp = '';
            if (interaction.customId.startsWith('modal_buyblock_')) {
                const k = interaction.customId.replace('modal_buyblock_', '');
                const b = SHOP_BLOCKS[k];
                if (!b) return interaction.reply({ content: '❌ Block invalid.', ephemeral: true });
                if (isUnlimited(k)) return interaction.reply({ content: `♾️ Unlimited!`, ephemeral: true });
                const tc = b.price * qty;
                if (ud.gems < tc) return interaction.reply({ content: `❌ Gems kurang! Butuh ${tc.toLocaleString()}`, ephemeral: true });
                ud.gems -= tc;
                ud.blocks[k] += qty;
                resp = `✅ Beli **${b.name} x${qty.toLocaleString()}** (-${tc.toLocaleString()})`;
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
                resp = `✅ Beli **${l.name} x${qty.toLocaleString()}**\n> WL ${ud.locks.wl} | DL ${ud.locks.dl} | BGL ${ud.locks.bgl} | BGLB ${ud.locks.bglb}`;
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

        // ===== AFK ONLINE BUTTON =====
        if (id.startsWith('afk_online_')) {
            const tu = id.replace('afk_online_', '');
            if (interaction.user.id !== tu) {
                return interaction.reply({ content: '❌ Tombol ini bukan untuk kamu.', ephemeral: true });
            }
            const t = afkCheckTimers.get(userId);
            if (t && t.timeoutTimer) clearTimeout(t.timeoutTimer);
            const cfg = db.getAfkCheckConfig(interaction.guildId);
            try {
                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅ Online')
                        .setDescription(
                            `Terima kasih <@${userId}>!\n\n` +
                            `> Auto Farm tetap jalan.\n` +
                            `> Cek berikutnya **${cfg.intervalMinutes} menit**.`
                        ).setTimestamp()],
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
            console.log(`⏹️ Auto Farm OFF via "${id}" (${interaction.user.username})`);
        }

        let eph = null, err = false;

        // ===== START FARMING =====
        if (id === 'start_farming') {
            if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
            await interaction.deferReply({ ephemeral: true });
            const cfg = db.getGuildConfig(interaction.guildId);
            if (!cfg) return interaction.editReply({ content: '❌ Server belum di-setup. Jalankan `/setup`.' });

            let thread = null, src = null;
            const dbt = db.getUserThread(interaction.guildId, userId);
            if (dbt) {
                try {
                    thread = await interaction.guild.channels.fetch(dbt.threadId);
                    if (thread && thread.parentId === interaction.channelId) {
                        if (thread.archived) try { await thread.setArchived(false); } catch {}
                        src = 'database';
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
                            src = 'cache';
                            db.setUserThread(interaction.guildId, userId, thread.id, interaction.channelId);
                        } else {
                            thread = null;
                            userThreads.delete(userId);
                        }
                    } catch {
                        thread = null;
                        userThreads.delete(userId);
                    }
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
                } else if (em) {
                    await invalidateOldPanel(userId, 'Panel lama dipindah ke thread baru.');
                }
                if (!valid) {
                    ud.currentView = 'main';
                    const m = await thread.send({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                    activeMessages.set(userId, m);
                }
                return interaction.editReply({ content: `✅ Kamu sudah punya thread: ${thread}` });
            }

            try {
                thread = await interaction.channel.threads.create({
                    name: `🌱 ${interaction.user.username}`,
                    autoArchiveDuration: 1440,
                    type: ChannelType.PrivateThread,
                    reason: `Farming ${interaction.user.username}`
                });
                try { await thread.members.add(userId); } catch {}
            } catch (e) {
                try {
                    thread = await interaction.channel.threads.create({
                        name: `🌱 ${interaction.user.username}`,
                        autoArchiveDuration: 1440,
                        type: ChannelType.PublicThread,
                        reason: `Farming ${interaction.user.username}`
                    });
                } catch (e2) {
                    return interaction.editReply({ content: `❌ Gagal buat thread: ${e2.message}` });
                }
            }

            userThreads.set(userId, thread.id);
            db.setUserThread(interaction.guildId, userId, thread.id, interaction.channelId);
            await invalidateOldPanel(userId, 'Panel lama dipindah ke thread baru.');

            ud.currentView = 'main';
            const m = await thread.send({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
            activeMessages.set(userId, m);
            return interaction.editReply({ content: `✅ Thread dibuat: ${thread}` });
        }

        // ===== CUSTOM BUY =====
        if (id.startsWith('customblock_')) {
            const k = id.replace('customblock_', '');
            const b = SHOP_BLOCKS[k];
            if (!b) return interaction.reply({ content: '❌ Block invalid.', ephemeral: true });
            if (isUnlimited(k)) return interaction.reply({ content: `♾️ Unlimited!`, ephemeral: true });
            return interaction.showModal(buildBuyModal(`Beli ${b.name}`, `modal_buyblock_${k}`, `Harga: ${b.price.toLocaleString()}/block`));
        }
        if (id.startsWith('customlock_')) {
            const k = id.replace('customlock_', '');
            const l = SHOP_LOCKS[k];
            if (!l) return interaction.reply({ content: '❌ Lock invalid.', ephemeral: true });
            return interaction.showModal(buildBuyModal(`Beli ${l.name}`, `modal_buylock_${k}`, `Harga: ${l.price.toLocaleString()}/lock`));
        }

        // ===== NAVIGASI =====
        if (id === 'nav_main') ud.currentView = 'main';
        else if (id === 'nav_shop') ud.currentView = 'shop';
        else if (id === 'nav_shop_tools') ud.currentView = 'shop_tools';
        else if (id === 'nav_shop_blocks') ud.currentView = 'shop_blocks';
        else if (id === 'nav_shop_items') ud.currentView = 'shop_items';
        else if (id === 'nav_shop_locks') ud.currentView = 'shop_locks';
        else if (id === 'nav_change_block') ud.currentView = 'change_block';
        else if (id === 'nav_skills') ud.currentView = 'skills';
        else if (id === 'nav_items') ud.currentView = 'items';
        else if (id === 'nav_tools') ud.currentView = 'tools';
        else if (id === 'nav_profile') ud.currentView = 'profile';
        else if (id === 'nav_event') ud.currentView = 'event';

        // ===== TOGGLE AUTO FARM =====
        else if (id === 'btn_toggle_auto') {
            const running = autoFarmIntervals.has(userId);
            if (running) {
                stopAutoFarm(userId);
                ud.autoFarm = false;
                ud.lastBreak = 'Auto Farm dimatikan.';
                console.log(`⏹️ Auto Farm OFF (${interaction.user.username})`);
            } else {
                if (getTotalBlocks(ud) <= 0) {
                    eph = '❌ Semua block habis!';
                    err = true;
                    ud.autoFarm = false;
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

        // ===== MANUAL FARM =====
        else if (id === 'btn_farm') {
            if (getTotalBlocks(ud) <= 0) {
                eph = '❌ Semua block habis!';
                err = true;
            } else {
                const r = doBreak(ud);
                if (r && !r.switched) ud.lastBreak = formatBreakLog(r, 'Manual');
                db.saveUser(ud);
            }
        }

        // ===== BELI TOOL =====
        else if (id.startsWith('buy_') && SHOP_TOOLS[id.slice(4)]) {
            const k = id.slice(4);
            const t = SHOP_TOOLS[k];
            if (ud.gems < t.price) { eph = `❌ Gems kurang! Butuh ${t.price.toLocaleString()}`; err = true; }
            else if (ud.ownedTools.includes(k)) { eph = `❌ Kamu sudah punya **${t.name}**!`; err = true; }
            else { ud.gems -= t.price; ud.ownedTools.push(k); db.saveUser(ud); eph = `✅ Beli **${t.name}**!`; }
        }

        // ===== SELECT BLOCK =====
        else if (id.startsWith('selectblock_')) {
            const k = id.slice(12);
            if (!SHOP_BLOCKS[k]) { eph = '❌ Block invalid.'; err = true; }
            else if (!isUnlimited(k) && ud.blocks[k] <= 0) { eph = `❌ Tidak punya **${SHOP_BLOCKS[k].name}**!`; err = true; }
            else { ud.selectedBlock = k; db.saveUser(ud); eph = `✅ Pakai **${SHOP_BLOCKS[k].name}**!`; }
        }

        // ===== BELI ITEM =====
        else if (id.startsWith('buy_') && SHOP_ITEMS[id.slice(4)]) {
            const k = id.slice(4);
            const i = SHOP_ITEMS[k];
            if (ud.gems < i.price) { eph = `❌ Gems kurang! Butuh ${i.price.toLocaleString()}`; err = true; }
            else { ud.gems -= i.price; ud.items[k]++; db.saveUser(ud); eph = `✅ Beli **${i.name}**!`; }
        }

        // ===== PAKAI ITEM =====
        else if (id.startsWith('use_')) {
            const k = id.slice(4);
            if (ud.items[k] <= 0) { eph = '❌ Tidak punya item ini.'; err = true; }
            else {
                ud.items[k]--;
                ud.activeBuffs[k] = Date.now() + (SHOP_ITEMS[k].duration * 1000);
                ud.currentView = 'main';
                db.saveUser(ud);
                eph = `✅ **${SHOP_ITEMS[k].name}** aktif 5 menit!`;
            }
        }

        // ===== EQUIP TOOL =====
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

        // ===== UPGRADE SKILL =====
        else if (id.startsWith('up_')) {
            const k = id.slice(3);
            const s = SKILLS[k];
            const lvl = ud.skills[k];
            const cost = getSkillUpgradeCost(lvl);
            if (lvl >= s.maxLevel) { eph = `⚠️ **${s.name}** sudah MAX!`; err = true; }
            else if (ud.skillPoints < cost) { eph = `❌ SP kurang! Butuh **${cost}**, punya **${ud.skillPoints}**.`; err = true; }
            else {
                ud.skillPoints -= cost;
                ud.skills[k]++;
                db.saveUser(ud);
                eph = `✅ ${s.emoji} **${s.name}** → Lv.**${ud.skills[k]}/${s.maxLevel}** (-${cost} SP)`;
                if (k === 'mining_speed') {
                    eph += `\n> ⏱️ Interval: **${(getAutoInterval(ud) / 1000).toFixed(1)}s**`;
                }
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