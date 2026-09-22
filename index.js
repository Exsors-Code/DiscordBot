require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    PermissionFlagsBits
} = require('discord.js');
const db = require('./database');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ] 
});

process.on('unhandledRejection', (error) => {
    if (error?.code === 10062) console.log('⚠️ [10062] Interaction expired');
    else console.error('❌ Unhandled Rejection:', error);
});
process.on('uncaughtException', (error) => {
    if (error?.code === 10062) console.log('⚠️ [10062] Interaction expired');
    else console.error('❌ Uncaught Exception:', error);
});

const LEADERBOARD_UPDATE_INTERVAL = 10000;

const EVENT_ROLE_IDS = [
    '1408101505008926840'
];

// ==========================================
// ⚙️ AUTO FARM TIMING
// ==========================================
const BASE_AUTO_INTERVAL = 5000;
const AUTO_INTERVAL_REDUCTION = 200;
const MIN_AUTO_INTERVAL = 3000;

function getAutoInterval(ud) {
    const reduction = ud.skills.mining_speed * AUTO_INTERVAL_REDUCTION;
    return Math.max(MIN_AUTO_INTERVAL, BASE_AUTO_INTERVAL - reduction);
}

// ==========================================
// 📈 XP CURVE — Growtopia-style
// ==========================================
function getMaxXpForLevel(level) {
    const L = level;
    const xp = (17 * L * L * L + 2433 * L * L + 6328 * L - 1908) / 3;
    return Math.max(1, Math.floor(xp));
}

// ==========================================
// ⭐ SKILL COST
// ==========================================
function getSkillUpgradeCost(currentLevel) {
    return Math.min(5, 1 + Math.floor(currentLevel / 2));
}

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
    wl:  { name: 'WL',  emoji: '🔹', price: 2000,     desc: 'White Lock' },
    dl:  { name: 'DL',  emoji: '🔸', price: 200000,   desc: 'Diamond Lock (= 100 WL)' },
    bgl: { name: 'BGL', emoji: '🔶', price: 20000000, desc: 'Blue Gem Lock (= 100 DL)' }
};
const SKILLS = {
    mining_speed:     { name: 'Mining Speed',     emoji: '⛏️', maxLevel: 10, desc: 'Mempercepat auto farm (-0.2s / level)' },
    gem_hunter:       { name: 'Gem Hunter',       emoji: '💎', maxLevel: 10, desc: '+10% Gems per level' },
    lucky_find:       { name: 'Lucky Find',       emoji: '🍀', maxLevel: 10, desc: '+2% peluang gems x10' },
    xp_boost:         { name: 'XP Boost',         emoji: '📈', maxLevel: 10, desc: '+10% XP per level' },
    inventory_master: { name: 'Inventory Master', emoji: '📦', maxLevel: 10, desc: '+5.000 kapasitas inventory' }
};

const BASE_RETURN_CHANCE = 0.10;
const MAX_CUSTOM_QTY = 1000000;

const autoFarmIntervals = new Map();
const autoFarmTokens = new Map();
const activeMessages = new Map();
const userThreads = new Map();
const userCache = new Map();
const guildLeaderboards = new Map();
const guildMemberCache = new Map();
const guildMemberCacheTime = new Map();
const MEMBER_CACHE_TTL = 5 * 60 * 1000;

const userLastInteraction = new Map();
const INTERACTION_LOCK_MS = 1500;

function getTotalBlocks(ud) { return ud.blocks.dirt + ud.blocks.pog; }

function getTotalLockValue(ud) {
    const { wl, dl, bgl, bglb } = ud.locks;
    return (wl * 1) + (dl * 100) + (bgl * 10000) + (bglb * 1000000);
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
    ud.maxXp = getMaxXpForLevel(ud.level);
    while (ud.xp >= ud.maxXp) {
        ud.xp -= ud.maxXp;
        ud.level++;
        ud.skillPoints++;
        ud.maxXp = getMaxXpForLevel(ud.level);
        leveledUp++;
    }
    return leveledUp;
}
function isEventManager(member) {
    if (!member) return false;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    return EVENT_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}
async function getGuildMemberIds(guildId) {
    const now = Date.now();
    const lastUpdate = guildMemberCacheTime.get(guildId) || 0;
    if (now - lastUpdate > MEMBER_CACHE_TTL || !guildMemberCache.has(guildId)) {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const members = await guild.members.fetch();
                guildMemberCache.set(guildId, new Set(members.keys()));
                guildMemberCacheTime.set(guildId, now);
            }
        } catch (e) { console.log(`⚠️ Gagal fetch members ${guildId}: ${e.message}`); }
    }
    return guildMemberCache.get(guildId) || new Set();
}

function loadUser(userId, username) {
    const ud = db.getUser(userId, username);
    ud.maxXp = getMaxXpForLevel(ud.level);
    return ud;
}

// ==========================================
// MAIN
// ==========================================
function mainEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const selected = SHOP_BLOCKS[ud.selectedBlock];
    const selectedQty = ud.blocks[ud.selectedBlock];
    const interval = getAutoInterval(ud);
    const autoStatus = ud.autoFarm ? `**ON** • ${(interval / 1000).toFixed(1)}s` : '**OFF**';
    const far = tool ? tool.blocksPerBreak : 1;
    const ev = ud.event;
    return new EmbedBuilder()
        .setColor(ud.autoFarm ? '#2b2d31' : '#1e1f22')
        .setTitle('🪓 Farming')
        .setDescription(`**@${ud.username}** (Level: ${ud.level})\nXP: **${ud.xp.toLocaleString()}** / ${ud.maxXp.toLocaleString()}`)
        .addFields(
            { name: '🎉 Event', value: `${ev.name} • Gems x${ev.gemsMult} | Blocks x${ev.blocksMult}`, inline: false },
            { name: 'Tool:', value: tool ? `${tool.emoji} ${tool.name} x${tool.multiplier} • ${far} far` : `⚪ Tidak ada • 1 far`, inline: false },
            { name: 'Buff:', value: getActiveBuffText(ud), inline: false },
            { name: '⛏️ Block:', value: `${selected.emoji} ${selected.name} (${selectedQty.toLocaleString()})`, inline: false },
            { name: 'Inventory:', value: `🟫 ${ud.blocks.dirt.toLocaleString()} | 🥔 ${ud.blocks.pog.toLocaleString()}`, inline: true },
            { name: '💰 Gems:', value: Math.floor(ud.gems).toLocaleString(), inline: true },
            { name: '⭐ SP:', value: `${ud.skillPoints}`, inline: true },
            { name: 'Auto Farm:', value: autoStatus, inline: false },
            { name: 'Last Break:', value: ud.lastBreak, inline: false }
        );
}
function mainButtons(ud) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_farm').setLabel('🌾 Farm').setStyle(ButtonStyle.Success).setDisabled(ud.autoFarm),
        new ButtonBuilder().setCustomId('nav_change_block').setLabel('⛏️ Change Block').setStyle(ButtonStyle.Primary),
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
    return new EmbedBuilder().setColor('#E91E63').setTitle('🎉 Event Aktif')
        .setDescription(
            `### **${ev.name}**\n\n` +
            `> 💰 **Gems Multiplier**: **x${ev.gemsMult}**\n` +
            `> 🟫 **Blocks Multiplier**: **x${ev.blocksMult}**\n` +
            `> 📈 XP juga kena multiplier Gems (rate sama)\n\n` +
            `*Gunakan \`/customevent\` untuk mengubah (khusus Event Manager).*`
        );
}
function eventButtons() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
}

function shopMainEmbed(ud) {
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop')
        .setDescription('Pilih kategori:')
        .addFields(
            { name: '🛠️ Tools', value: 'Tool boost farming', inline: true },
            { name: '🟫 Blocks', value: 'Beli block untuk farm', inline: true },
            { name: '🎒 Items', value: 'Consumable buff', inline: true },
            { name: '🔒 Locks', value: 'Beli lock', inline: true }
        )
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
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
    const lines = ['**🛠️ TOOLS**'];
    for (const key in SHOP_TOOLS) {
        const t = SHOP_TOOLS[key];
        const owned = ud.ownedTools.includes(key) ? ' ✅' : '';
        lines.push(`${t.emoji} **${t.name}**${owned} — ${t.price.toLocaleString()} 💰\n> x${t.multiplier} Gems | ⛏️ **${t.blocksPerBreak} far**`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — Tools')
        .setDescription(lines.join('\n\n'))
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
    const lines = ['**BELI BLOCK**', ''];
    for (const key in SHOP_BLOCKS) {
        const b = SHOP_BLOCKS[key];
        lines.push(`${b.emoji} **${b.name}** — ${b.price.toLocaleString()} 💰/block\n> Reward: **${b.gemsMin}-${b.gemsMax}** | **${b.xpMin}-${b.xpMax} XP**\n> 📦 Kamu punya: **${ud.blocks[key].toLocaleString()}**`);
    }
    return new EmbedBuilder().setColor('#8B4513').setTitle('🛒 Shop — Blocks')
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Gems kamu: ${Math.floor(ud.gems).toLocaleString()}` });
}
function shopBlocksButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('customblock_dirt').setLabel('🟫 Beli Dirt').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('customblock_pog').setLabel('🥔 Beli POG').setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_shop').setLabel('⬅️ Kategori').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

function changeBlockEmbed(ud) {
    const lines = ['**⛏️ Ganti Block Aktif**', ''];
    for (const key in SHOP_BLOCKS) {
        const b = SHOP_BLOCKS[key];
        const isSelected = ud.selectedBlock === key ? ' **[AKTIF]**' : '';
        const stock = ud.blocks[key];
        lines.push(`${b.emoji} **${b.name}**${isSelected}\n> Reward: **${b.gemsMin}-${b.gemsMax}** | **${b.xpMin}-${b.xpMax} XP**\n> Stok: **${stock.toLocaleString()}**`);
    }
    return new EmbedBuilder().setColor('#8B4513').setTitle('⛏️ Change Block')
        .setDescription(lines.join('\n\n'));
}
function changeBlockButtons(ud) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('selectblock_dirt').setLabel(`🟫 Dirt (${ud.blocks.dirt.toLocaleString()})`)
                .setStyle(ud.selectedBlock === 'dirt' ? ButtonStyle.Success : ButtonStyle.Primary)
                .setDisabled(ud.selectedBlock === 'dirt' || ud.blocks.dirt <= 0),
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
    const lines = [];
    for (const key in SHOP_ITEMS) {
        const i = SHOP_ITEMS[key];
        lines.push(`${i.emoji} **${i.name}** — ${i.price.toLocaleString()} 💰\n> ${i.desc}\n> Dimiliki: ${ud.items[key]}`);
    }
    return new EmbedBuilder().setColor('#5865F2').setTitle('🛒 Shop — Items')
        .setDescription(lines.join('\n\n'))
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
    const lines = ['**BELI LOCK**', ''];
    for (const key in SHOP_LOCKS) {
        const l = SHOP_LOCKS[key];
        lines.push(`${l.emoji} **${l.name}** — ${l.price.toLocaleString()} 💰/lock\n> ${l.desc}\n> 📦 Kamu punya: **${ud.locks[key].toLocaleString()}**`);
    }
    lines.push(`\n**Auto-convert:** 100 WL → 1 DL | 100 DL → 1 BGL | 100 BGL → 1 BGLB`);
    return new EmbedBuilder().setColor('#F1C40F').setTitle('🛒 Shop — Locks')
        .setDescription(lines.join('\n\n'))
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
    const totalSkillLvl = Object.values(ud.skills).reduce((a,b)=>a+b,0);
    const totalMax = Object.values(SKILLS).reduce((a,b)=>a+b.maxLevel,0);
    const currentInterval = (getAutoInterval(ud) / 1000).toFixed(1);
    const nextXp = getMaxXpForLevel(ud.level);
    return new EmbedBuilder().setColor('#9B59B6').setTitle('⭐ Skills')
        .setDescription(
            `### ⭐ Skill Points: **${ud.skillPoints}** SP\n` +
            `> Setiap naik **Level** mendapat **+1 SP**.\n` +
            `> Biaya upgrade naik tiap level skill.\n` +
            `> Total Skill Level: **${totalSkillLvl} / ${totalMax}**\n` +
            `> ⏱️ Auto Farm Interval: **${currentInterval}s**\n` +
            `> 📈 XP Next Level: **${nextXp.toLocaleString()}**\n\n` +
            Object.entries(SKILLS).map(([key, s]) => {
                const lvl = ud.skills[key];
                const isMax = lvl >= s.maxLevel;
                const cost = getSkillUpgradeCost(lvl);
                const status = isMax ? '**MAX** ✅' : `Lv. ${lvl}/${s.maxLevel} • Cost: **${cost} SP**`;
                return `${s.emoji} **${s.name}** — ${status}\n> ${s.desc}`;
            }).join('\n\n')
        )
        .setFooter({ text: `Level kamu: ${ud.level} • SP: ${ud.skillPoints}` });
}
function skillsButtons(ud) {
    const sp = ud.skillPoints;
    const dis = (key) => {
        const lvl = ud.skills[key];
        if (lvl >= SKILLS[key].maxLevel) return true;
        return sp < getSkillUpgradeCost(lvl);
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
        .setDescription(
            `🍗 **Arroz Con Pollo** x${ud.items.arroz}\n> x2 Gems selama 5 menit\n\n` +
            `🍀 **Lucky Clover** x${ud.items.clover}\n> x2 XP selama 5 menit`
        );
}
function itemsButtons(ud) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('use_arroz').setLabel('🍗 Pakai Arroz').setStyle(ButtonStyle.Primary).setDisabled(ud.items.arroz <= 0),
        new ButtonBuilder().setCustomId('use_clover').setLabel('🍀 Pakai Clover').setStyle(ButtonStyle.Primary).setDisabled(ud.items.clover <= 0),
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
}

function toolsEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    return new EmbedBuilder().setColor('#3498DB').setTitle('🛠️ Tools')
        .setDescription(
            (tool 
                ? `**Equipped Tool:** ${tool.emoji} **${tool.name} x${tool.multiplier}**`
                : '*Tidak ada tool yang di-equip*'
            ) +
            `\n\n*Tools permanently multiply both Gems and XP.*`
        );
}
function toolsButtons(ud) {
    const rows = [];
    if (ud.ownedTools.length > 0) {
        const options = ud.ownedTools.map(key => {
            const t = SHOP_TOOLS[key];
            return new StringSelectMenuOptionBuilder()
                .setLabel(t.name)
                .setValue(`equip_${key}`)
                .setDescription(`x${t.multiplier} Gems • ${t.blocksPerBreak} far`)
                .setDefault(ud.equippedTool === key);
        });
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel('Unequip')
                .setValue('unequip')
                .setDescription('Lepas tool (x1)')
                .setDefault(!ud.equippedTool)
        );
        const select = new StringSelectMenuBuilder()
            .setCustomId('select_tool')
            .setPlaceholder('Pilih tool')
            .addOptions(options);
        rows.push(new ActionRowBuilder().addComponents(select));
    }
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    ));
    return rows;
}

function profileEmbed(ud) {
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const totalValue = getTotalLockValue(ud);
    return new EmbedBuilder().setColor('#F1C40F').setTitle(`👤 Profile — ${ud.username}`)
        .addFields(
            { name: '🏆 Level', value: `${ud.level}`, inline: true },
            { name: '🛠️ Tool', value: tool ? `${tool.emoji} ${tool.name}` : 'Tidak ada', inline: true },
            { name: '💰 Gems', value: Math.floor(ud.gems).toLocaleString(), inline: true },
            { name: '🟫 Dirt', value: ud.blocks.dirt.toLocaleString(), inline: true },
            { name: '🥔 POG', value: ud.blocks.pog.toLocaleString(), inline: true },
            { name: '⭐ SP', value: `${ud.skillPoints}`, inline: true },
            { name: '🔒 Locks', value:
                `🔹 **WL**: ${ud.locks.wl.toLocaleString()}\n` +
                `🔸 **DL**: ${ud.locks.dl.toLocaleString()}\n` +
                `🔶 **BGL**: ${ud.locks.bgl.toLocaleString()}\n` +
                `🌟 **BGLB**: ${ud.locks.bglb.toLocaleString()}\n` +
                `**Total: ${totalValue.toLocaleString()} WL**`, inline: false }
        );
}
function profileButtons() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
    )];
}

async function generateLeaderboardEmbed(guildId) {
    const allUsers = db.getAllUsers();
    const memberIds = await getGuildMemberIds(guildId);
    const guild = client.guilds.cache.get(guildId);
    const guildName = guild ? guild.name : 'Server';

    const entries = allUsers
        .filter(ud => memberIds.has(ud.userId))
        .map(ud => ({
            username: ud.username,
            locks: ud.locks,
            level: ud.level,
            totalValue: getTotalLockValue(ud)
        }))
        .filter(e => e.totalValue > 0);

    entries.sort((a, b) => b.totalValue - a.totalValue);

    const top = entries.slice(0, 20);
    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((e, i) => {
        const rank = medals[i] || `**#${i + 1}**`;
        const lockParts = [];
        if (e.locks.wl > 0) lockParts.push(`🔹 ${e.locks.wl}`);
        if (e.locks.dl > 0) lockParts.push(`🔸 ${e.locks.dl}`);
        if (e.locks.bgl > 0) lockParts.push(`🔶 ${e.locks.bgl}`);
        if (e.locks.bglb > 0) lockParts.push(`🌟 ${e.locks.bglb}`);
        return (
            `${rank} **${e.username}** (Lv.${e.level})\n` +
            `> ${lockParts.join(' | ')}\n` +
            `> 💰 Total: **${e.totalValue.toLocaleString()} WL**`
        );
    });

    if (lines.length === 0) lines.push('*Belum ada pemain dengan lock di server ini.*');

    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🏆 Leaderboard — ${guildName}`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: `Total ${entries.length} pemain • Update tiap ${LEADERBOARD_UPDATE_INTERVAL / 1000} detik` })
        .setTimestamp();
}
async function refreshAllLeaderboards() {
    for (const [guildId, msg] of guildLeaderboards.entries()) {
        try {
            const embed = await generateLeaderboardEmbed(guildId);
            await msg.edit({ embeds: [embed] });
        } catch (err) {}
    }
}

function renderEmbed(ud) {
    switch(ud.currentView) {
        case 'shop':         return shopMainEmbed(ud);
        case 'shop_tools':   return shopToolsEmbed(ud);
        case 'shop_blocks':  return shopBlocksEmbed(ud);
        case 'shop_items':   return shopItemsEmbed(ud);
        case 'shop_locks':   return shopLocksEmbed(ud);
        case 'change_block': return changeBlockEmbed(ud);
        case 'skills':       return skillsEmbed(ud);
        case 'items':        return itemsEmbed(ud);
        case 'tools':        return toolsEmbed(ud);
        case 'profile':      return profileEmbed(ud);
        case 'event':        return eventEmbed(ud);
        default:             return mainEmbed(ud);
    }
}
function renderButtons(ud) {
    switch(ud.currentView) {
        case 'shop':         return shopMainButtons();
        case 'shop_tools':   return shopToolsButtons();
        case 'shop_blocks':  return shopBlocksButtons();
        case 'shop_items':   return shopItemsButtons();
        case 'shop_locks':   return shopLocksButtons();
        case 'change_block': return changeBlockButtons(ud);
        case 'skills':       return skillsButtons(ud);
        case 'items':        return itemsButtons(ud);
        case 'tools':        return toolsButtons(ud);
        case 'profile':      return profileButtons();
        case 'event':        return eventButtons();
        default:             return mainButtons(ud);
    }
}

function doBreak(ud) {
    const blockType = ud.selectedBlock;
    const bd = SHOP_BLOCKS[blockType];
    const tool = ud.equippedTool ? SHOP_TOOLS[ud.equippedTool] : null;
    const farPower = tool ? tool.blocksPerBreak : 1;
    const ev = ud.event;

    if (ud.blocks[blockType] <= 0) {
        const fallback = Object.keys(SHOP_BLOCKS).find(k => k !== blockType && ud.blocks[k] > 0);
        if (fallback) {
            ud.selectedBlock = fallback;
            ud.lastBreak = `⚠️ ${bd.name} habis! Auto-switch ke ${SHOP_BLOCKS[fallback].name}.`;
            return { switched: true };
        }
        ud.lastBreak = '⚠️ Semua block habis! Auto Farm berhenti.';
        ud.autoFarm = false;
        return null;
    }

    const blocksToBreak = Math.min(farPower, ud.blocks[blockType]);
    ud.blocks[blockType] -= blocksToBreak;

    const toolMult = tool ? tool.multiplier : 1;
    const gemSkillMult = 1 + (ud.skills.gem_hunter * 0.10);
    const gemBuffMult = isBuffActive(ud, 'arroz') ? 2 : 1;
    let totalGems = 0;
    for (let i = 0; i < blocksToBreak; i++) {
        const baseGems = Math.floor(Math.random() * (bd.gemsMax - bd.gemsMin + 1)) + bd.gemsMin;
        let g = Math.floor(baseGems * toolMult * gemSkillMult * gemBuffMult * ev.gemsMult);
        if (Math.random() < ud.skills.lucky_find * 0.02) g *= 10;
        totalGems += g;
    }

    const xpSkillMult = 1 + (ud.skills.xp_boost * 0.10);
    const xpBuffMult = isBuffActive(ud, 'clover') ? 2 : 1;
    let totalXp = 0;
    for (let i = 0; i < blocksToBreak; i++) {
        const baseXp = Math.floor(Math.random() * (bd.xpMax - bd.xpMin + 1)) + bd.xpMin;
        totalXp += Math.floor(baseXp * xpSkillMult * xpBuffMult * ev.gemsMult);
    }

    let returned = 0;
    for (let i = 0; i < blocksToBreak; i++) {
        if (Math.random() < BASE_RETURN_CHANCE) returned++;
    }
    returned = Math.floor(returned * ev.blocksMult);
    ud.blocks[blockType] += returned;

    ud.gems += totalGems;
    ud.xp += totalXp;
    const levelsGained = checkLevelUp(ud);

    return { gemsGained: totalGems, xpGained: totalXp, blockType, levelsGained, blocksBroken: blocksToBreak, returned };
}
function formatBreakLog(result, prefix = 'Auto') {
    const bd = SHOP_BLOCKS[result.blockType];
    let msg = `${prefix} [${bd.name}]: -${result.blocksBroken}`;
    if (result.returned > 0) msg += ` (+${result.returned})`;
    msg += ` → +${result.gemsGained.toLocaleString()} 💰 / +${result.xpGained.toLocaleString()} XP`;
    if (result.levelsGained > 0) msg += ` 🎉 **LEVEL UP! +${result.levelsGained} SP**`;
    return msg;
}

function startAutoFarm(userId) {
    const existingId = autoFarmIntervals.get(userId);
    if (existingId) { clearInterval(existingId); autoFarmIntervals.delete(userId); }

    const ud0 = userCache.get(userId);
    if (!ud0) return;
    
    const interval = getAutoInterval(ud0);
    const myToken = (autoFarmTokens.get(userId) || 0) + 1;
    autoFarmTokens.set(userId, myToken);

    const intervalId = setInterval(async () => {
        if (autoFarmTokens.get(userId) !== myToken) {
            clearInterval(intervalId);
            if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
            return;
        }

        const ud = userCache.get(userId);
        if (!ud || ud.autoFarm !== true) {
            clearInterval(intervalId);
            if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
            return;
        }

        const lastInteract = userLastInteraction.get(userId) || 0;
        const isUserLocked = (Date.now() - lastInteract) < INTERACTION_LOCK_MS;

        const result = doBreak(ud);
        if (result && !result.switched) ud.lastBreak = formatBreakLog(result, 'Auto');

        if (ud.autoFarm === false) {
            autoFarmTokens.set(userId, (autoFarmTokens.get(userId) || 0) + 1);
            clearInterval(intervalId);
            if (autoFarmIntervals.get(userId) === intervalId) autoFarmIntervals.delete(userId);
            db.saveUser(ud);
            if (!isUserLocked) {
                const m = activeMessages.get(userId);
                if (m) { try { await m.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
            }
            return;
        }

        if (!ud._lastSave || Date.now() - ud._lastSave > 3000) {
            db.saveUser(ud);
            ud._lastSave = Date.now();
        }

        if (isUserLocked) return;

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
    }, interval);

    autoFarmIntervals.set(userId, intervalId);
}
function stopAutoFarm(userId) {
    autoFarmTokens.set(userId, (autoFarmTokens.get(userId) || 0) + 1);
    const id = autoFarmIntervals.get(userId);
    if (id) { clearInterval(id); autoFarmIntervals.delete(userId); }
}

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

async function setupGuild(guild, panelChannelId, leaderboardChannelId) {
    try {
        const panelChannel = await client.channels.fetch(panelChannelId).catch(() => null);
        if (panelChannel) {
            const messages = await panelChannel.messages.fetch({ limit: 50 }).catch(() => new Map());
            for (const msg of messages.values()) {
                if (msg.author.id === client.user.id && msg.components.length > 0) {
                    await msg.delete().catch(() => {});
                }
            }
            let deletedThreads = 0;
            const safeDelete = async (thread) => {
                try {
                    if (thread.archived) {
                        try { await thread.setArchived(false, 'Cleanup'); await new Promise(r => setTimeout(r, 500)); } catch {}
                    }
                    await thread.delete('Cleanup');
                    deletedThreads++;
                } catch (e) {
                    try {
                        try { await thread.setLocked(true, 'Cleanup'); } catch {}
                        await thread.setArchived(true, 'Cleanup');
                        deletedThreads++;
                    } catch {}
                }
            };
            try {
                const active = await panelChannel.threads.fetchActive();
                for (const t of active.threads.values()) {
                    if (t.name.startsWith('🌱')) await safeDelete(t);
                }
            } catch {}
            for (const type of ['public', 'private']) {
                try {
                    let before = undefined, keepGoing = true;
                    while (keepGoing) {
                        const arch = await panelChannel.threads.fetchArchived({ type, limit: 100, before });
                        if (!arch.threads || arch.threads.size === 0) break;
                        for (const t of arch.threads.values()) {
                            if (t.name.startsWith('🌱')) await safeDelete(t);
                        }
                        const last = arch.threads.last()?.archivedAt;
                        if (!last || last === before) keepGoing = false;
                        else before = last;
                    }
                } catch {}
            }
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
            await panelChannel.send({ embeds: [embed], components: [row] });
            console.log(`📖 [${guild.name}] Panel terkirim (thread lama: ${deletedThreads})`);
        }

        const lbChannel = await client.channels.fetch(leaderboardChannelId).catch(() => null);
        if (lbChannel) {
            const msgs = await lbChannel.messages.fetch({ limit: 30 }).catch(() => new Map());
            for (const m of msgs.values()) {
                if (m.author.id === client.user.id) await m.delete().catch(() => {});
            }
            const embed = await generateLeaderboardEmbed(guild.id);
            const msg = await lbChannel.send({ embeds: [embed] });
            guildLeaderboards.set(guild.id, msg);
            db.updateLeaderboardMessage(guild.id, msg.id);
            console.log(`🏆 [${guild.name}] Leaderboard aktif`);
        }
    } catch (err) { console.error(`❌ Setup guild ${guild.name} gagal:`, err.message); }
}

client.once('ready', async () => {
    console.log(`✅ Bot ${client.user.tag} siap!`);
    console.log(`🌐 Terhubung ke ${client.guilds.cache.size} server`);
    await db.connectDB();

    setInterval(() => {
        try {
            const src = path.join(__dirname, 'growcord.sqlite');
            const dst = path.join(__dirname, `backup_${Date.now()}.sqlite`);
            if (fs.existsSync(src)) { fs.copyFileSync(src, dst); console.log(`💾 Backup: ${path.basename(dst)}`); }
        } catch (e) { console.error('Backup gagal:', e.message); }
    }, 6 * 60 * 60 * 1000);

    const configs = db.getAllGuildConfigs();
    for (const cfg of configs) {
        const guild = client.guilds.cache.get(cfg.guildId);
        if (!guild) continue;
        console.log(`🔧 Setup guild: ${guild.name}`);
        await setupGuild(guild, cfg.panelChannelId, cfg.leaderboardChannelId);
    }
    setInterval(refreshAllLeaderboards, LEADERBOARD_UPDATE_INTERVAL);
});

client.on('guildCreate', (guild) => {
    console.log(`➕ Join guild: ${guild.name} (${guild.id})`);
});

client.on('interactionCreate', async interaction => {
    try {
        const _userId = interaction.user.id;
        if (_userId) userLastInteraction.set(_userId, Date.now());

        if (interaction.isChatInputCommand()) {
            const userId = interaction.user.id;

            if (interaction.commandName === 'setup') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const panel = interaction.options.getChannel('panel');
                const lb = interaction.options.getChannel('leaderboard');
                db.setGuildConfig(interaction.guildId, panel.id, lb.id);
                await setupGuild(interaction.guild, panel.id, lb.id);
                return interaction.editReply({ content: `✅ Setup selesai!\n> Panel: ${panel}\n> Leaderboard: ${lb}` });
            }

            if (interaction.commandName === 'unsetup') {
                if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
                db.removeGuildConfig(interaction.guildId);
                guildLeaderboards.delete(interaction.guildId);
                guildMemberCache.delete(interaction.guildId);
                return interaction.reply({ content: `✅ Konfigurasi dihapus.`, ephemeral: true });
            }

            // ==========================================
            // /resetplayer
            // ==========================================
            if (interaction.commandName === 'resetplayer') {
                await interaction.deferReply({ ephemeral: true });

                const targetUser = interaction.options.getUser('player');
                if (!targetUser) {
                    return interaction.editReply({ content: '❌ Player tidak valid.' });
                }

                // Cek role/izin
                const member = interaction.guild 
                    ? await interaction.guild.members.fetch(userId).catch(() => null) 
                    : null;
                if (!isEventManager(member)) {
                    return interaction.editReply({ 
                        content: `🔒 Hanya Event Manager / Administrator yang bisa pakai command ini.` 
                    });
                }

                // Stop auto farm kalau sedang jalan
                if (autoFarmIntervals.has(targetUser.id)) {
                    stopAutoFarm(targetUser.id);
                }

                // Hapus dari semua cache
                userCache.delete(targetUser.id);
                activeMessages.delete(targetUser.id);
                userThreads.delete(targetUser.id);

                // Hapus dari database
                const success = db.resetUser(targetUser.id);

                if (!success) {
                    return interaction.editReply({ 
                        content: `⚠️ Player **${targetUser.username}** belum pernah main atau data tidak ditemukan.` 
                    });
                }

                console.log(`♻️ Reset player: ${targetUser.username} (${targetUser.id}) by ${interaction.user.username}`);

                // Refresh leaderboard
                refreshAllLeaderboards();

                return interaction.editReply({ 
                    content: `✅ **Reset berhasil!**\n\n> 👤 Player: **${targetUser.username}**\n> 🆔 ID: \`${targetUser.id}\`\n> ♻️ Semua data (level, gems, locks, items, tools, dll) sudah direset.\n\n*Player akan mulai dari awal saat membuka bot lagi.*` 
                });
            }

            if (interaction.commandName === 'farming') {
                await interaction.deferReply();
                const ud = loadUser(userId, interaction.user.username);
                userCache.set(userId, ud);
                ud.currentView = 'main';
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
                    const member = interaction.guild 
                        ? await interaction.guild.members.fetch(userId).catch(() => null) 
                        : null;
                    if (!isEventManager(member)) {
                        return interaction.editReply({ 
                            content: `🔒 Hanya Event Manager / Administrator yang bisa pakai command ini.` 
                        });
                    }
                    const ud = loadUser(userId, interaction.user.username);
                    userCache.set(userId, ud);
                    const gemsMult = interaction.options.getInteger('gems');
                    const blocksMult = interaction.options.getInteger('blocks');
                    ud.event.gemsMult = gemsMult;
                    ud.event.blocksMult = blocksMult;
                    ud.event.name = `Custom Event (Gems x${gemsMult}, Blocks x${blocksMult})`;
                    db.saveUser(ud);
                    const msg = activeMessages.get(userId);
                    if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
                    return interaction.editReply({ 
                        content: `✅ Event diupdate!\n> 💰 Gems & 📈 XP: **x${gemsMult}**\n> 🟫 Blocks: **x${blocksMult}**` 
                    });
                } catch (innerErr) {
                    console.error('❌ /customevent error:', innerErr);
                    return interaction.editReply({ content: `❌ Gagal: ${innerErr.message}` }).catch(() => {});
                }
            }
            return;
        }

        if (interaction.isStringSelectMenu()) {
            const userId = interaction.user.id;
            if (interaction.customId === 'select_tool') {
                let ud = userCache.get(userId);
                if (!ud) { ud = loadUser(userId, interaction.user.username); userCache.set(userId, ud); }
                const value = interaction.values[0];
                let msg = '';
                if (value === 'unequip') {
                    ud.equippedTool = null;
                    msg = '✅ Tool di-unequip.';
                } else if (value.startsWith('equip_')) {
                    const key = value.replace('equip_', '');
                    if (ud.ownedTools.includes(key)) {
                        ud.equippedTool = key;
                        msg = `✅ **${SHOP_TOOLS[key].name}** di-equip!`;
                    }
                }
                db.saveUser(ud);
                await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
                try { await interaction.followUp({ content: msg, ephemeral: true }); } catch {}
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            const userId = interaction.user.id;
            const ud = loadUser(userId, interaction.user.username);
            userCache.set(userId, ud);

            const qtyRaw = interaction.fields.getTextInputValue('quantity');
            const qty = parseInt(qtyRaw);
            if (isNaN(qty) || qty <= 0 || qty > MAX_CUSTOM_QTY) {
                return interaction.reply({ content: `❌ Jumlah tidak valid! 1 - ${MAX_CUSTOM_QTY.toLocaleString()}.`, ephemeral: true });
            }

            let responseMsg = '';

            if (interaction.customId.startsWith('modal_buyblock_')) {
                const key = interaction.customId.replace('modal_buyblock_', '');
                const b = SHOP_BLOCKS[key];
                if (!b) return interaction.reply({ content: '❌ Block tidak valid.', ephemeral: true });
                const totalCost = b.price * qty;
                if (ud.gems < totalCost) return interaction.reply({ content: `❌ Gems kurang! Butuh ${totalCost.toLocaleString()}`, ephemeral: true });
                ud.gems -= totalCost;
                ud.blocks[key] += qty;
                responseMsg = `✅ Beli **${b.name} x${qty.toLocaleString()}** (-${totalCost.toLocaleString()})`;
            }
            else if (interaction.customId.startsWith('modal_buylock_')) {
                const key = interaction.customId.replace('modal_buylock_', '');
                const l = SHOP_LOCKS[key];
                if (!l) return interaction.reply({ content: '❌ Lock tidak valid.', ephemeral: true });
                const totalCost = l.price * qty;
                if (ud.gems < totalCost) return interaction.reply({ content: `❌ Gems kurang! Butuh ${totalCost.toLocaleString()}`, ephemeral: true });
                ud.gems -= totalCost;
                ud.locks[key] += qty;
                db.saveUser(ud);
                responseMsg = `✅ Beli **${l.name} x${qty.toLocaleString()}**\n> Sekarang: WL ${ud.locks.wl} | DL ${ud.locks.dl} | BGL ${ud.locks.bgl} | BGLB ${ud.locks.bglb}`;
            }

            db.saveUser(ud);
            const msg = activeMessages.get(userId);
            if (msg) { try { await msg.edit({ embeds: [renderEmbed(ud)], components: renderButtons(ud) }); } catch {} }
            refreshAllLeaderboards();
            return interaction.reply({ content: responseMsg, ephemeral: true });
        }

        if (!interaction.isButton()) return;
        const id = interaction.customId;
        const userId = interaction.user.id;

        let ud = userCache.get(userId);
        if (!ud) {
            ud = loadUser(userId, interaction.user.username);
            userCache.set(userId, ud);
        }
        ud.username = interaction.user.username;

        if (ud.autoFarm === true && !autoFarmIntervals.has(userId)) {
            ud.autoFarm = false;
            ud.lastBreak = 'Auto Farm di-reset.';
        }

        if (id !== 'btn_toggle_auto' && ud.autoFarm) {
            ud.autoFarm = false;
            stopAutoFarm(userId);
            ud.lastBreak = 'Auto Farm dimatikan (interaksi lain).';
            db.saveUser(ud);
        }

        let ephemeralMsg = null;
        let ephemeralError = false;

        if (id === 'start_farming') {
            if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
            await interaction.deferReply({ ephemeral: true });
            const cfg = db.getGuildConfig(interaction.guildId);
            if (!cfg) return interaction.editReply({ content: '❌ Server belum di-setup. Jalankan `/setup`.' });

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
                        type: ChannelType.PrivateThread
                    });
                    try { await thread.members.add(userId); } catch {}
                    userThreads.set(userId, thread.id);
                } catch (err) {
                    try {
                        thread = await interaction.channel.threads.create({
                            name: `🌱 ${interaction.user.username}`,
                            autoArchiveDuration: 1440,
                            type: ChannelType.PublicThread
                        });
                        userThreads.set(userId, thread.id);
                    } catch (err2) {
                        return interaction.editReply({ content: `❌ Gagal buat thread: ${err2.message}` });
                    }
                }
            }
            ud.currentView = 'main';
            const msg = await thread.send({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
            activeMessages.set(userId, msg);
            return interaction.editReply({ content: `✅ Thread: ${thread}` });
        }

        if (id.startsWith('customblock_')) {
            const key = id.replace('customblock_', '');
            const b = SHOP_BLOCKS[key];
            if (!b) return interaction.reply({ content: '❌ Block tidak valid.', ephemeral: true });
            return interaction.showModal(buildBuyModal(`Beli ${b.name}`, `modal_buyblock_${key}`, `Harga: ${b.price.toLocaleString()}/block`));
        }
        if (id.startsWith('customlock_')) {
            const key = id.replace('customlock_', '');
            const l = SHOP_LOCKS[key];
            if (!l) return interaction.reply({ content: '❌ Lock tidak valid.', ephemeral: true });
            return interaction.showModal(buildBuyModal(`Beli ${l.name}`, `modal_buylock_${key}`, `Harga: ${l.price.toLocaleString()}/lock`));
        }

        if (id === 'nav_main')              ud.currentView = 'main';
        else if (id === 'nav_shop')         ud.currentView = 'shop';
        else if (id === 'nav_shop_tools')   ud.currentView = 'shop_tools';
        else if (id === 'nav_shop_blocks')  ud.currentView = 'shop_blocks';
        else if (id === 'nav_shop_items')   ud.currentView = 'shop_items';
        else if (id === 'nav_shop_locks')   ud.currentView = 'shop_locks';
        else if (id === 'nav_change_block') ud.currentView = 'change_block';
        else if (id === 'nav_skills')       ud.currentView = 'skills';
        else if (id === 'nav_items')        ud.currentView = 'items';
        else if (id === 'nav_tools')        ud.currentView = 'tools';
        else if (id === 'nav_profile')      ud.currentView = 'profile';
        else if (id === 'nav_event')        ud.currentView = 'event';

        else if (id === 'btn_toggle_auto') {
            const isCurrentlyRunning = autoFarmIntervals.has(userId);
            if (isCurrentlyRunning) {
                ud.autoFarm = false;
                ud.lastBreak = 'Auto Farm dimatikan.';
                stopAutoFarm(userId);
            } else {
                if (getTotalBlocks(ud) <= 0) {
                    ephemeralMsg = '❌ Semua block habis!';
                    ephemeralError = true;
                    ud.autoFarm = false;
                } else {
                    ud.autoFarm = true;
                    ud.lastBreak = 'Auto Farm aktif!';
                    startAutoFarm(userId);
                }
            }
            db.saveUser(ud);
        }

        else if (id === 'btn_farm') {
            if (getTotalBlocks(ud) <= 0) {
                ephemeralMsg = '❌ Semua block habis!';
                ephemeralError = true;
            } else {
                const result = doBreak(ud);
                if (result && !result.switched) ud.lastBreak = formatBreakLog(result, 'Manual');
                db.saveUser(ud);
            }
        }

        else if (id.startsWith('buy_') && SHOP_TOOLS[id.slice(4)]) {
            const key = id.slice(4);
            const t = SHOP_TOOLS[key];
            if (ud.gems < t.price) { ephemeralMsg = `❌ Gems kurang! Butuh ${t.price.toLocaleString()}`; ephemeralError = true; }
            else if (ud.ownedTools.includes(key)) { ephemeralMsg = `❌ Kamu sudah punya **${t.name}**!`; ephemeralError = true; }
            else {
                ud.gems -= t.price;
                ud.ownedTools.push(key);
                db.saveUser(ud);
                ephemeralMsg = `✅ Beli **${t.name}**! (${t.blocksPerBreak} far, x${t.multiplier})`;
            }
        }

        else if (id.startsWith('selectblock_')) {
            const key = id.slice(12);
            if (!SHOP_BLOCKS[key]) { ephemeralMsg = '❌ Block tidak valid.'; ephemeralError = true; }
            else if (ud.blocks[key] <= 0) { ephemeralMsg = `❌ Kamu tidak punya **${SHOP_BLOCKS[key].name}**!`; ephemeralError = true; }
            else { ud.selectedBlock = key; db.saveUser(ud); ephemeralMsg = `✅ Pakai **${SHOP_BLOCKS[key].name}**!`; }
        }

        else if (id.startsWith('buy_') && SHOP_ITEMS[id.slice(4)]) {
            const key = id.slice(4);
            const i = SHOP_ITEMS[key];
            if (ud.gems < i.price) { ephemeralMsg = `❌ Gems kurang! Butuh ${i.price.toLocaleString()}`; ephemeralError = true; }
            else { ud.gems -= i.price; ud.items[key]++; db.saveUser(ud); ephemeralMsg = `✅ Beli **${i.name}**!`; }
        }

        else if (id.startsWith('use_')) {
            const key = id.slice(4);
            if (ud.items[key] <= 0) { ephemeralMsg = '❌ Tidak punya item ini.'; ephemeralError = true; }
            else {
                ud.items[key]--;
                ud.activeBuffs[key] = Date.now() + (SHOP_ITEMS[key].duration * 1000);
                ud.currentView = 'main';
                db.saveUser(ud);
                ephemeralMsg = `✅ **${SHOP_ITEMS[key].name}** aktif 5 menit!`;
            }
        }

        else if (id.startsWith('equip_')) {
            const key = id.slice(6);
            if (!ud.ownedTools.includes(key)) { ephemeralMsg = '❌ Tidak punya tool ini.'; ephemeralError = true; }
            else { ud.equippedTool = key; db.saveUser(ud); ephemeralMsg = `✅ **${SHOP_TOOLS[key].name}** di-equip!`; }
        }
        else if (id === 'unequip_tool') { 
            ud.equippedTool = null; 
            db.saveUser(ud);
            ephemeralMsg = '✅ Tool di-unequip.'; 
        }

        else if (id.startsWith('up_')) {
            const key = id.slice(3);
            const s = SKILLS[key];
            const lvl = ud.skills[key];
            const cost = getSkillUpgradeCost(lvl);

            if (lvl >= s.maxLevel) { 
                ephemeralMsg = `⚠️ **${s.name}** sudah MAX!`; 
                ephemeralError = true; 
            }
            else if (ud.skillPoints < cost) { 
                ephemeralMsg = `❌ SP tidak cukup! Butuh **${cost} SP**, kamu punya **${ud.skillPoints} SP**.`; 
                ephemeralError = true; 
            }
            else {
                ud.skillPoints -= cost;
                ud.skills[key]++;
                
                if (key === 'mining_speed' && ud.autoFarm) {
                    startAutoFarm(userId);
                }
                
                db.saveUser(ud);
                ephemeralMsg = `✅ ${s.emoji} **${s.name}** → Lv.**${ud.skills[key]}/${s.maxLevel}** (-${cost} SP, sisa ${ud.skillPoints} SP)`;
                if (key === 'mining_speed') {
                    const newInterval = (getAutoInterval(ud) / 1000).toFixed(1);
                    ephemeralMsg += `\n> ⏱️ Auto Farm sekarang: **${newInterval}s**`;
                }
            }
        }

        if (ud.autoFarm === false && autoFarmIntervals.has(userId)) {
            stopAutoFarm(userId);
        }

        if (!ephemeralError) {
            try {
                await interaction.update({ embeds: [renderEmbed(ud)], components: renderButtons(ud) });
                activeMessages.set(userId, interaction.message);
            } catch (err) {}
        }

        if (ephemeralMsg) {
            try {
                if (ephemeralError) await interaction.reply({ content: ephemeralMsg, ephemeral: true });
                else await interaction.followUp({ content: ephemeralMsg, ephemeral: true });
            } catch (err) {}
        }

        refreshAllLeaderboards();
    } catch (err) {
        if (err?.code === 10062) console.log('⚠️ [10062] Interaction expired');
        else console.error('❌ Interaction error:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);