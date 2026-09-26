const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const db = require('./database');

// ==========================================
// SLASH COMMANDS
// ==========================================
const QUEST_COMMANDS = [
    new SlashCommandBuilder()
        .setName('quest')
        .setDescription('📜 Daily quest — selesaikan untuk hadiah')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('questadmin')
        .setDescription('⚙️ Admin quest management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(s => s
            .setName('give')
            .setDescription('Give reward manual ke user')
            .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
            .addIntegerOption(o => o.setName('gems').setDescription('Jumlah gems').setRequired(false).setMinValue(0))
            .addIntegerOption(o => o.setName('wl').setDescription('Jumlah WL').setRequired(false).setMinValue(0))
        )
        .addSubcommand(s => s
            .setName('reroll')
            .setDescription('Reroll quest user (biar random lagi)')
            .addUserOption(o => o.setName('user').setDescription('Target').setRequired(true))
        )
        .addSubcommand(s => s.setName('status').setDescription('Statistik quest server'))
        .toJSON()
];

// ==========================================
// TIER DETECTION
// ==========================================
function getTotalLockValue(ud) {
    return (ud.locks.wl * 1) + (ud.locks.dl * 100) + (ud.locks.bgl * 10000) + (ud.locks.bglb * 1000000);
}

function getTotalBlocks(ud) {
    let total = 0;
    const blocks = ud.blocks || {};
    for (const k in blocks) total += (blocks[k] || 0);
    return total;
}

function detectTier(ud) {
    const lvl = ud.level || 1;
    const gems = ud.gems || 0;
    const totalWL = getTotalLockValue(ud);

    if (lvl >= 100 || gems >= 1_000_000_000 || totalWL >= 50_000) return 'expert';
    if (lvl >= 60 || gems >= 50_000_000 || totalWL >= 1_000) return 'advanced';
    if (lvl >= 30 || gems >= 1_000_000 || totalWL >= 100) return 'intermediate';
    if (lvl >= 10 || gems >= 100_000 || totalWL >= 10) return 'beginner';
    return 'newbie';
}

const TIER_META = {
    newbie:       { name: 'Newbie',       emoji: '🌱', color: '#57F287' },
    beginner:     { name: 'Beginner',     emoji: '🌿', color: '#2ECC71' },
    intermediate: { name: 'Intermediate', emoji: '⚡', color: '#F1C40F' },
    advanced:     { name: 'Advanced',     emoji: '🔥', color: '#E67E22' },
    expert:       { name: 'Expert',       emoji: '💎', color: '#9B59B6' }
};

// ==========================================
// QUEST POOL per TIER
// ==========================================
const QUEST_POOL = {
    newbie: [
        { type: 'break_blocks', title: 'Tambang Pertama',  emoji: '⛏️', min: 30,    max: 80,     gems: 8000,   wl: 1 },
        { type: 'play_manual',  title: 'Coba Manual Farm', emoji: '🌾', min: 5,     max: 15,     gems: 5000,   wl: 1 },
        { type: 'play_auto',    title: 'Auto Sebentar',    emoji: '🤖', min: 60,    max: 180,    gems: 6000,   wl: 1 },
        { type: 'gain_gems',    title: 'Kumpulkan Gems',   emoji: '💰', min: 20000, max: 50000,  gems: 4000,   wl: 1 },
        { type: 'use_item',     title: 'Pakai Item',       emoji: '🎒', min: 1,     max: 2,      gems: 5000,   wl: 1 },
        { type: 'buy_item',     title: 'Belanja Pertama',  emoji: '🛒', min: 1,     max: 2,      gems: 4000,   wl: 1 },
        { type: 'break_blocks', title: 'Rajin Menambang',  emoji: '⚒️', min: 50,    max: 120,    gems: 10000,  wl: 2 },
        { type: 'level_up',     title: 'Naik 1 Level',     emoji: '📈', min: 1,     max: 1,      gems: 10000,  wl: 2 }
    ],
    beginner: [
        { type: 'break_blocks', title: 'Penambang Muda',   emoji: '⛏️', min: 150,   max: 400,    gems: 40000,  wl: 3 },
        { type: 'play_manual',  title: 'Manual 20x',       emoji: '🌾', min: 15,    max: 30,     gems: 30000,  wl: 2 },
        { type: 'play_auto',    title: 'Auto 5 Menit',     emoji: '🤖', min: 180,   max: 400,    gems: 35000,  wl: 3 },
        { type: 'gain_gems',    title: 'Kumpulkan 200K',   emoji: '💰', min: 100000,max: 250000, gems: 25000,  wl: 2 },
        { type: 'use_item',     title: 'Pakai 3 Item',     emoji: '🎒', min: 2,     max: 4,      gems: 30000,  wl: 2 },
        { type: 'buy_item',     title: 'Belanja 3x',       emoji: '🛒', min: 2,     max: 4,      gems: 28000,  wl: 2 },
        { type: 'level_up',     title: 'Naik 2 Level',     emoji: '📈', min: 1,     max: 2,      gems: 60000,  wl: 4 },
        { type: 'win_gacha',    title: 'Coba Gacha',       emoji: '🎰', min: 1,     max: 3,      gems: 50000,  wl: 3 }
    ],
    intermediate: [
        { type: 'break_blocks', title: 'Penambang Ahli',   emoji: '⚒️', min: 800,   max: 2000,   gems: 200000, wl: 8 },
        { type: 'play_manual',  title: 'Manual 50x',       emoji: '🌾', min: 30,    max: 60,     gems: 150000, wl: 6 },
        { type: 'play_auto',    title: 'Auto 15 Menit',    emoji: '🤖', min: 600,   max: 1200,   gems: 180000, wl: 7 },
        { type: 'gain_gems',    title: 'Kumpulkan 5M',     emoji: '💰', min: 2000000,max: 5000000,gems: 120000, wl: 5 },
        { type: 'use_item',     title: 'Pakai 5 Item',     emoji: '🎒', min: 4,     max: 8,      gems: 150000, wl: 5 },
        { type: 'buy_item',     title: 'Belanja 5x',       emoji: '🛒', min: 4,     max: 8,      gems: 130000, wl: 5 },
        { type: 'level_up',     title: 'Naik 3 Level',     emoji: '📈', min: 2,     max: 3,      gems: 300000, wl: 10 },
        { type: 'win_gacha',    title: 'Gacha 3x',         emoji: '🎰', min: 3,     max: 6,      gems: 250000, wl: 8 },
        { type: 'trade',        title: 'Trade Sekali',     emoji: '🔄', min: 1,     max: 1,      gems: 200000, wl: 6 }
    ],
    advanced: [
        { type: 'break_blocks', title: 'Raja Tambang',     emoji: '👑', min: 5000,  max: 12000,  gems: 1000000,wl: 25 },
        { type: 'play_manual',  title: 'Manual 100x',      emoji: '🌾', min: 80,    max: 150,    gems: 800000, wl: 20 },
        { type: 'play_auto',    title: 'Auto 30 Menit',    emoji: '🤖', min: 1500,  max: 2500,   gems: 900000, wl: 22 },
        { type: 'gain_gems',    title: 'Kumpulkan 50M',    emoji: '💰', min: 20000000, max: 50000000, gems: 700000, wl: 18 },
        { type: 'use_item',     title: 'Pakai 10 Item',    emoji: '🎒', min: 8,     max: 15,     gems: 800000, wl: 18 },
        { type: 'buy_item',     title: 'Belanja 10x',      emoji: '🛒', min: 8,     max: 15,     gems: 700000, wl: 18 },
        { type: 'level_up',     title: 'Naik 4 Level',     emoji: '📈', min: 3,     max: 5,      gems: 1500000,wl: 35 },
        { type: 'win_gacha',    title: 'Gacha 8x',         emoji: '🎰', min: 5,     max: 10,     gems: 1200000,wl: 28 },
        { type: 'trade',        title: 'Trade 2x',         emoji: '🔄', min: 2,     max: 3,      gems: 1000000,wl: 22 }
    ],
    expert: [
        { type: 'break_blocks', title: 'Legenda Tambang',  emoji: '🌟', min: 20000, max: 50000,  gems: 5000000,wl: 75 },
        { type: 'play_manual',  title: 'Manual 200x',      emoji: '🌾', min: 150,   max: 300,    gems: 4000000,wl: 60 },
        { type: 'play_auto',    title: 'Auto 60 Menit',    emoji: '🤖', min: 3000,  max: 5000,   gems: 4500000,wl: 65 },
        { type: 'gain_gems',    title: 'Kumpulkan 500M',   emoji: '💰', min: 200000000, max: 500000000, gems: 3500000, wl: 55 },
        { type: 'use_item',     title: 'Pakai 20 Item',    emoji: '🎒', min: 15,    max: 30,     gems: 4000000,wl: 55 },
        { type: 'buy_item',     title: 'Belanja 20x',      emoji: '🛒', min: 15,    max: 30,     gems: 3500000,wl: 55 },
        { type: 'level_up',     title: 'Naik 5 Level',     emoji: '📈', min: 4,     max: 7,      gems: 8000000,wl: 100 },
        { type: 'win_gacha',    title: 'Gacha 15x',        emoji: '🎰', min: 10,    max: 20,     gems: 6000000,wl: 85 },
        { type: 'trade',        title: 'Trade 5x',         emoji: '🔄', min: 3,     max: 6,      gems: 5000000,wl: 70 }
    ]
};

// ==========================================
// HELPER
// ==========================================
function getTodayKey() {
    const now = new Date();
    const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}-${String(wib.getUTCDate()).padStart(2, '0')}`;
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateQuestsForUser(ud) {
    const tier = detectTier(ud);
    const pool = QUEST_POOL[tier];
    const picked = shuffle(pool).slice(0, Math.min(5, pool.length));

    const quests = picked.map((q, i) => {
        const target = randInt(q.min, q.max);
        const scale = 0.9 + (Math.random() * 0.3);
        const rewardGems = Math.round(q.gems * scale / 1000) * 1000;
        const rewardWL = Math.max(1, Math.round(q.wl * scale));

        return {
            id: `q${i}`,
            type: q.type,
            title: q.title,
            emoji: q.emoji,
            target,
            reward: { gems: rewardGems, wl: rewardWL }
        };
    });

    return { tier, quests };
}

// ==========================================
// QUEST DATA
// ==========================================
function getQuestData(ud) {
    const today = getTodayKey();

    if (
        !ud.quests ||
        ud.quests.date !== today ||
        !ud.quests.quests ||
        !Array.isArray(ud.quests.quests) ||
        ud.quests.quests.length === 0
    ) {
        const gen = generateQuestsForUser(ud);
        ud.quests = {
            date: today,
            tier: gen.tier,
            quests: gen.quests,
            progress: {},
            claimed: {},
            completed: 0
        };
        for (const q of gen.quests) {
            ud.quests.progress[q.id] = 0;
            ud.quests.claimed[q.id] = false;
        }
    }

    for (const q of ud.quests.quests) {
        if (ud.quests.progress[q.id] === undefined) ud.quests.progress[q.id] = 0;
        if (ud.quests.claimed[q.id] === undefined) ud.quests.claimed[q.id] = false;
    }

    return ud.quests;
}

function addProgress(ud, type, amount = 1) {
    const qd = getQuestData(ud);
    let changed = false;

    for (const q of qd.quests) {
        if (q.type !== type) continue;
        if (qd.claimed[q.id]) continue;

        const before = qd.progress[q.id] || 0;
        qd.progress[q.id] = Math.min(before + amount, q.target);

        if (qd.progress[q.id] !== before) changed = true;
    }

    return changed;
}

function autoClaim(ud) {
    const qd = getQuestData(ud);
    const rewards = [];

    for (const q of qd.quests) {
        if (qd.claimed[q.id]) continue;
        if ((qd.progress[q.id] || 0) >= q.target) {
            qd.claimed[q.id] = true;
            qd.completed = (qd.completed || 0) + 1;

            if (q.reward.gems > 0) ud.gems += q.reward.gems;
            if (q.reward.wl > 0) ud.locks.wl += q.reward.wl;

            rewards.push({
                quest: q,
                gems: q.reward.gems,
                wl: q.reward.wl
            });
        }
    }

    return rewards;
}

// ==========================================
// BUILD EMBED
// ==========================================
function buildQuestEmbed(ud) {
    const qd = getQuestData(ud);
    const meta = TIER_META[qd.tier] || TIER_META.newbie;

    const lines = qd.quests.map(q => {
        const prog = qd.progress[q.id] || 0;
        const done = qd.claimed[q.id];
        const barLength = 10;
        const filled = Math.min(Math.round((prog / q.target) * barLength), barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        const status = done ? '✅' : (prog >= q.target ? '🎁' : '⏳');
        const rewardParts = [];
        if (q.reward.gems > 0) rewardParts.push(`💰 ${q.reward.gems.toLocaleString()}`);
        if (q.reward.wl > 0) rewardParts.push(`🔹 ${q.reward.wl} WL`);

        return `${status} ${q.emoji} **${q.title}**${done ? ' — *SELESAI*' : ''}\n` +
               `> \`${bar}\` **${Math.min(prog, q.target).toLocaleString()}/${q.target.toLocaleString()}**\n` +
               `> 🎁 ${rewardParts.join(' • ')}`;
    });

    const totalDone = qd.completed || 0;
    const totalQuests = qd.quests.length;

    return new EmbedBuilder()
        .setColor(meta.color)
        .setTitle('📜 Daily Quest')
        .setDescription(
            `${meta.emoji} **Tier kamu:** **${meta.name}**\n` +
            `📅 Tanggal: **${qd.date}**\n` +
            `📊 Progress: **${totalDone} / ${totalQuests}** quest selesai\n\n` +
            `> 🔄 Quest auto-reset tiap hari (WIB)\n` +
            `> 🎁 Reward **otomatis masuk** saat selesai\n` +
            `> 🎲 Quest di-random sesuai tier kamu`
        )
        .addFields({ name: '📋  Daftar Quest', value: lines.join('\n\n'), inline: false })
        .setFooter({ text: 'GrowExs Daily Quest · Refresh manual dengan tombol di bawah' })
        .setTimestamp();
}

function buildQuestButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quest_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quest_summary').setLabel('📊 Ringkasan').setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_main').setLabel('🏠 Main Menu').setStyle(ButtonStyle.Secondary)
        )
    ];
}

// ==========================================
// MAIN HANDLER
// ==========================================
async function handleQuestInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'quest') {
            await handleQuestCommand(interaction);
            return true;
        }
        if (interaction.commandName === 'questadmin') {
            await handleQuestAdmin(interaction);
            return true;
        }
    }
    if (interaction.isButton() && interaction.customId.startsWith('quest_')) {
        await handleQuestButton(interaction);
        return true;
    }
    return false;
}

async function handleQuestCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ud = db.getUser(interaction.user.id, interaction.user.username);
    getQuestData(ud);

    const rewards = autoClaim(ud);
    if (rewards.length > 0) db.saveUser(ud);

    const embed = buildQuestEmbed(ud);
    const buttons = buildQuestButtons();

    if (rewards.length > 0) {
        const rewardLines = rewards.map(r => {
            const parts = [];
            if (r.gems > 0) parts.push(`💰 ${r.gems.toLocaleString()}`);
            if (r.wl > 0) parts.push(`🔹 ${r.wl} WL`);
            return `✅ ${r.quest.emoji} **${r.quest.title}** — ${parts.join(' • ')}`;
        });

        return interaction.editReply({
            content: `🎁 **${rewards.length} quest selesai!**\n${rewardLines.join('\n')}`,
            embeds: [embed],
            components: buttons
        });
    }

    return interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleQuestButton(interaction) {
    const userId = interaction.user.id;
    const ud = db.getUser(userId, interaction.user.username);
    getQuestData(ud);

    if (interaction.customId === 'quest_refresh') {
        const rewards = autoClaim(ud);
        if (rewards.length > 0) db.saveUser(ud);

        try {
            await interaction.update({
                embeds: [buildQuestEmbed(ud)],
                components: buildQuestButtons()
            });
        } catch {}

        if (rewards.length > 0) {
            const rewardLines = rewards.map(r => {
                const parts = [];
                if (r.gems > 0) parts.push(`💰 ${r.gems.toLocaleString()}`);
                if (r.wl > 0) parts.push(`🔹 ${r.wl} WL`);
                return `✅ ${r.quest.emoji} **${r.quest.title}** — ${parts.join(' • ')}`;
            });
            await interaction.followUp({
                content: `🎁 **${rewards.length} quest selesai!**\n${rewardLines.join('\n')}`,
                ephemeral: true
            });
        }
        return;
    }

    if (interaction.customId === 'quest_summary') {
        const qd = getQuestData(ud);
        const lines = qd.quests.map(q => {
            const prog = qd.progress[q.id] || 0;
            const done = qd.claimed[q.id];
            const status = done ? '✅' : (prog >= q.target ? '🎁' : '⏳');
            return `${status} ${q.emoji} ${q.title} — **${Math.min(prog, q.target)}/${q.target}**`;
        });

        const totalDone = qd.completed || 0;
        const totalPossible = qd.quests.length;
        const percent = Math.round((totalDone / totalPossible) * 100);
        const barLength = 15;
        const filled = Math.round((totalDone / totalPossible) * barLength);
        const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        const meta = TIER_META[qd.tier] || TIER_META.newbie;

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(meta.color)
                .setTitle('📊 Quest Summary')
                .setDescription(
                    `${meta.emoji} Tier: **${meta.name}**\n` +
                    `\`${progressBar}\` **${percent}%**\n\n` +
                    lines.join('\n')
                )
                .setFooter({ text: `Total: ${totalDone}/${totalPossible} quest` })],
            ephemeral: true
        });
    }
}

async function handleQuestAdmin(interaction) {
    if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    if (sub === 'give') {
        const target = interaction.options.getUser('user');
        const gems = interaction.options.getInteger('gems') || 0;
        const wl = interaction.options.getInteger('wl') || 0;

        if (gems === 0 && wl === 0) return interaction.editReply({ content: '❌ Minimal kasih gems atau WL.' });

        const tud = db.getUser(target.id, target.username);
        if (gems > 0) tud.gems += gems;
        if (wl > 0) tud.locks.wl += wl;
        db.saveUser(tud);

        const parts = [];
        if (gems > 0) parts.push(`💰 **+${gems.toLocaleString()} Gems**`);
        if (wl > 0) parts.push(`🔹 **+${wl} WL**`);

        return interaction.editReply({
            content: `✅ **Give reward berhasil!**\n\n> 👤 Target: **${target.username}**\n> 🎁 ${parts.join('\n> 🎁 ')}`
        });
    }

    if (sub === 'reroll') {
        const target = interaction.options.getUser('user');
        const tud = db.getUser(target.id, target.username);
        tud.quests = null;
        getQuestData(tud);
        db.saveUser(tud);
        return interaction.editReply({ content: `✅ Quest **${target.username}** di-reroll (tier: **${tud.quests.tier}**).` });
    }

    if (sub === 'status') {
        const today = getTodayKey();
        const allUsers = db.getAllUsers();
        let active = 0;
        let totalDone = 0;
        const tierCount = { newbie: 0, beginner: 0, intermediate: 0, advanced: 0, expert: 0 };

        for (const u of allUsers) {
            if (u.quests && u.quests.date === today) {
                active++;
                totalDone += u.quests.completed || 0;
                if (tierCount[u.quests.tier] !== undefined) tierCount[u.quests.tier]++;
            }
        }

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('📊 Quest Status')
                .addFields(
                    { name: '📅 Tanggal', value: today, inline: true },
                    { name: '👥 User Aktif', value: `${active}`, inline: true },
                    { name: '✅ Total Selesai', value: `${totalDone}`, inline: true },
                    { name: '🌱 Newbie', value: `${tierCount.newbie}`, inline: true },
                    { name: '🌿 Beginner', value: `${tierCount.beginner}`, inline: true },
                    { name: '⚡ Intermediate', value: `${tierCount.intermediate}`, inline: true },
                    { name: '🔥 Advanced', value: `${tierCount.advanced}`, inline: true },
                    { name: '💎 Expert', value: `${tierCount.expert}`, inline: true }
                )]
        });
    }
}

// ==========================================
// EXPORT
// ==========================================
function trackQuest(ud, type, amount = 1) {
    try {
        const changed = addProgress(ud, type, amount);
        if (!changed) return [];
        const rewards = autoClaim(ud);
        return rewards;
    } catch (e) {
        console.error('trackQuest error:', e.message);
        return [];
    }
}

module.exports = {
    QUEST_COMMANDS,
    handleQuestInteraction,
    trackQuest,
    autoClaim,
    getQuestData,
    buildQuestEmbed,
    buildQuestButtons,
    detectTier,
    TIER_META
};