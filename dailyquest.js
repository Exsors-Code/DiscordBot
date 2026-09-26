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
            .setDescription('Give quest reward manual ke user')
            .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
            .addIntegerOption(o => o.setName('gems').setDescription('Jumlah gems').setRequired(false).setMinValue(0))
            .addIntegerOption(o => o.setName('wl').setDescription('Jumlah WL').setRequired(false).setMinValue(0))
        )
        .addSubcommand(s => s.setName('resetall').setDescription('Reset semua quest semua user'))
        .addSubcommand(s => s.setName('status').setDescription('Lihat statistik quest server'))
        .toJSON()
];

// ==========================================
// KONFIGURASI QUEST
// ==========================================
// type quest:
//   - break_blocks: break N block (semua jenis)
//   - play_manual:  klik Farm Manual N kali
//   - play_auto:    auto farm N detik total
//   - level_up:     naik N level
//   - buy_item:     beli N item dari shop
//   - use_item:     pakai N item (buff/instant)
//   - gain_gems:    dapat N gems total
//   - win_gacha:    roll gacha N kali
//   - trade:        trade dengan player N kali

const DAILY_QUESTS = [
    // ===== EASY =====
    {
        id: 'break_50',
        type: 'break_blocks',
        target: 50,
        title: 'Pemula Tambang',
        desc: 'Break 50 block (semua jenis)',
        emoji: '⛏️',
        reward: { gems: 50000, wl: 0 }
    },
    {
        id: 'manual_10',
        type: 'play_manual',
        target: 10,
        title: 'Manual Worker',
        desc: 'Klik Farm Manual 10 kali',
        emoji: '🌾',
        reward: { gems: 30000, wl: 0 }
    },
    {
        id: 'gems_100k',
        type: 'gain_gems',
        target: 100000,
        title: 'Kolektor Gems',
        desc: 'Kumpulkan 100.000 Gems hari ini',
        emoji: '💰',
        reward: { gems: 25000, wl: 0 }
    },
    // ===== MEDIUM =====
    {
        id: 'break_500',
        type: 'break_blocks',
        target: 500,
        title: 'Penambang Ahli',
        desc: 'Break 500 block',
        emoji: '⚒️',
        reward: { gems: 200000, wl: 5 }
    },
    {
        id: 'level_2',
        type: 'level_up',
        target: 2,
        title: 'Naik Kelas',
        desc: 'Naik 2 level hari ini',
        emoji: '📈',
        reward: { gems: 150000, wl: 3 }
    },
    {
        id: 'buy_5',
        type: 'buy_item',
        target: 5,
        title: 'Shopper',
        desc: 'Beli 5 item dari shop',
        emoji: '🛒',
        reward: { gems: 100000, wl: 2 }
    },
    {
        id: 'use_3',
        type: 'use_item',
        target: 3,
        title: 'Pengguna Item',
        desc: 'Pakai 3 item (buff/instant)',
        emoji: '🎒',
        reward: { gems: 80000, wl: 2 }
    },
    // ===== HARD =====
    {
        id: 'break_2000',
        type: 'break_blocks',
        target: 2000,
        title: 'Raja Tambang',
        desc: 'Break 2.000 block',
        emoji: '👑',
        reward: { gems: 1000000, wl: 25 }
    },
    {
        id: 'gacha_5',
        type: 'win_gacha',
        target: 5,
        title: 'Penjudi Sejati',
        desc: 'Roll gacha 5 kali',
        emoji: '🎰',
        reward: { gems: 500000, wl: 10 }
    },
    {
        id: 'trade_1',
        type: 'trade',
        target: 1,
        title: 'Pedagang',
        desc: 'Trade dengan player lain 1 kali',
        emoji: '🔄',
        reward: { gems: 300000, wl: 8 }
    },
    {
        id: 'auto_300',
        type: 'play_auto',
        target: 300,
        title: 'Auto Master',
        desc: 'Auto farm total 5 menit hari ini',
        emoji: '🤖',
        reward: { gems: 250000, wl: 6 }
    },
    // ===== EPIC =====
    {
        id: 'break_10000',
        type: 'break_blocks',
        target: 10000,
        title: 'Legenda Tambang',
        desc: 'Break 10.000 block dalam sehari',
        emoji: '🌟',
        reward: { gems: 5000000, wl: 100 }
    },
    {
        id: 'gain_10m',
        type: 'gain_gems',
        target: 10000000,
        title: 'Miliarder',
        desc: 'Kumpulkan 10.000.000 Gems hari ini',
        emoji: '💎',
        reward: { gems: 3000000, wl: 75 }
    }
];

// ==========================================
// HELPER — Tanggal hari ini (reset tiap hari)
// ==========================================
function getTodayKey() {
    const now = new Date();
    // Pakai timezone Asia/Jakarta (WIB)
    const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, '0')}-${String(wib.getUTCDate()).padStart(2, '0')}`;
}

// ==========================================
// GET / INIT QUEST DATA USER
// ==========================================
function getQuestData(ud) {
    const today = getTodayKey();

    if (!ud.quests || ud.quests.date !== today) {
        ud.quests = {
            date: today,
            progress: {},   // { questId: number }
            claimed: {},    // { questId: true }
            completed: 0
        };
    }

    // Pastikan semua quest ada di progress
    for (const q of DAILY_QUESTS) {
        if (ud.quests.progress[q.id] === undefined) ud.quests.progress[q.id] = 0;
    }

    return ud.quests;
}

// ==========================================
// TAMBAH PROGRESS
// ==========================================
function addProgress(ud, type, amount = 1) {
    const qd = getQuestData(ud);
    let changed = false;

    for (const q of DAILY_QUESTS) {
        if (q.type !== type) continue;
        if (qd.claimed[q.id]) continue;

        const before = qd.progress[q.id] || 0;
        qd.progress[q.id] = Math.min(before + amount, q.target);

        if (qd.progress[q.id] !== before) changed = true;
    }

    return changed;
}

// ==========================================
// AUTO-CLAIM REWARD (saat progress penuh)
// ==========================================
function autoClaim(ud) {
    const qd = getQuestData(ud);
    const rewards = [];

    for (const q of DAILY_QUESTS) {
        if (qd.claimed[q.id]) continue;
        if ((qd.progress[q.id] || 0) >= q.target) {
            // Auto claim
            qd.claimed[q.id] = true;
            qd.completed++;

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

    const easy = [];
    const medium = [];
    const hard = [];
    const epic = [];

    for (const q of DAILY_QUESTS) {
        const prog = qd.progress[q.id] || 0;
        const done = qd.claimed[q.id];
        const barLength = 10;
        const filled = Math.min(Math.round((prog / q.target) * barLength), barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        const rewardText = [];
        if (q.reward.gems > 0) rewardText.push(`💰 ${q.reward.gems.toLocaleString()}`);
        if (q.reward.wl > 0) rewardText.push(`🔹 ${q.reward.wl} WL`);

        const statusIcon = done ? '✅' : (prog >= q.target ? '🎁' : '⏳');
        const line = `${statusIcon} ${q.emoji} **${q.title}**${done ? ' — *SELESAI*' : ''}\n> ${q.desc}\n> \`${bar}\` **${Math.min(prog, q.target).toLocaleString()}/${q.target.toLocaleString()}**\n> 🎁 ${rewardText.join(' • ')}`;

        // Klasifikasi berdasarkan reward
        const totalReward = q.reward.gems + (q.reward.wl * 2000000);
        if (q.reward.wl >= 50 || q.reward.gems >= 3000000) epic.push(line);
        else if (q.reward.wl >= 10 || q.reward.gems >= 500000) hard.push(line);
        else if (q.reward.wl >= 2 || q.reward.gems >= 80000) medium.push(line);
        else easy.push(line);
    }

    // Hitung total reward hari ini
    const totalCompleted = qd.completed;
    const totalQuests = DAILY_QUESTS.length;

    const fields = [];
    if (easy.length) fields.push({ name: '🟢 EASY', value: easy.join('\n\n'), inline: false });
    if (medium.length) fields.push({ name: '🟡 MEDIUM', value: medium.join('\n\n'), inline: false });
    if (hard.length) fields.push({ name: '🔴 HARD', value: hard.join('\n\n'), inline: false });
    if (epic.length) fields.push({ name: '🌟 EPIC', value: epic.join('\n\n'), inline: false });

    return new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('📜 Daily Quest')
        .setDescription(
            `**Progress hari ini:** **${totalCompleted} / ${totalQuests}** quest selesai\n` +
            `> 📅 Tanggal: **${qd.date}**\n` +
            `> 🔄 Reset otomatis setiap hari (WIB)\n` +
            `> 🎁 Reward **otomatis masuk** saat quest selesai!`
        )
        .addFields(...fields)
        .setFooter({ text: `Quest otomatis reset besok · Klik tombol di bawah untuk refresh` })
        .setTimestamp();
}

function buildQuestButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('quest_refresh').setLabel('🔄 Refresh Progress').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('quest_summary').setLabel('📊 Ringkasan Hari Ini').setStyle(ButtonStyle.Secondary)
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

// ==========================================
// /quest
// ==========================================
async function handleQuestCommand(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const ud = db.getUser(interaction.user.id, interaction.user.username);
    getQuestData(ud);

    // Auto-claim yang sudah selesai
    const rewards = autoClaim(ud);
    if (rewards.length > 0) db.saveUser(ud);

    const embed = buildQuestEmbed(ud);
    const buttons = buildQuestButtons();

    // Kalau ada reward baru, tampilkan notifikasi
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

// ==========================================
// BUTTON HANDLER
// ==========================================
async function handleQuestButton(interaction) {
    const userId = interaction.user.id;
    const ud = db.getUser(userId, interaction.user.username);
    getQuestData(ud);

    // Refresh
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

    // Summary
    if (interaction.customId === 'quest_summary') {
        const qd = getQuestData(ud);
        const lines = [];

        for (const q of DAILY_QUESTS) {
            const prog = qd.progress[q.id] || 0;
            const done = qd.claimed[q.id];
            const status = done ? '✅' : (prog >= q.target ? '🎁' : '⏳');
            lines.push(`${status} ${q.emoji} ${q.title} — **${Math.min(prog, q.target)}/${q.target}**`);
        }

        const totalDone = qd.completed;
        const totalPossible = DAILY_QUESTS.length;
        const percent = Math.round((totalDone / totalPossible) * 100);

        const barLength = 15;
        const filled = Math.round((totalDone / totalPossible) * barLength);
        const progressBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('📊 Quest Summary')
                .setDescription(
                    `**Progress:** \`${progressBar}\` **${percent}%**\n\n` +
                    lines.join('\n')
                )
                .setFooter({ text: `Total: ${totalDone}/${totalPossible} quest` })],
            ephemeral: true
        });
    }
}

// ==========================================
// ADMIN HANDLER
// ==========================================
async function handleQuestAdmin(interaction) {
    if (!interaction.guild) return interaction.reply({ content: '❌ Hanya di server.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ===== GIVE =====
    if (sub === 'give') {
        const target = interaction.options.getUser('user');
        const gems = interaction.options.getInteger('gems') || 0;
        const wl = interaction.options.getInteger('wl') || 0;

        if (gems === 0 && wl === 0) {
            return interaction.editReply({ content: '❌ Minimal kasih gems atau WL.' });
        }

        const tud = db.getUser(target.id, target.username);
        if (gems > 0) tud.gems += gems;
        if (wl > 0) tud.locks.wl += wl;
        db.saveUser(tud);

        const parts = [];
        if (gems > 0) parts.push(`💰 **+${gems.toLocaleString()} Gems**`);
        if (wl > 0) parts.push(`🔹 **+${wl} WL**`);

        return interaction.editReply({
            content: `✅ **Give reward manual berhasil!**\n\n> 👤 Target: **${target.username}**\n> 🎁 ${parts.join('\n> 🎁 ')}`
        });
    }

    // ===== RESET ALL =====
    if (sub === 'resetall') {
        const allUsers = db.getAllUsers();
        let count = 0;
        for (const u of allUsers) {
            u.quests = null;
            db.saveUser(u);
            count++;
        }
        return interaction.editReply({ content: `✅ Reset quest untuk **${count}** user.` });
    }

    // ===== STATUS =====
    if (sub === 'status') {
        const today = getTodayKey();
        const allUsers = db.getAllUsers();
        let active = 0;
        let totalDone = 0;

        for (const u of allUsers) {
            if (u.quests && u.quests.date === today) {
                active++;
                totalDone += u.quests.completed || 0;
            }
        }

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('📊 Quest Status')
                .addFields(
                    { name: '📅 Tanggal', value: today, inline: true },
                    { name: '👥 User Aktif', value: `${active}`, inline: true },
                    { name: '✅ Total Quest Selesai', value: `${totalDone}`, inline: true },
                    { name: '📜 Total Quest Tersedia', value: `${DAILY_QUESTS.length}`, inline: true }
                )]
        });
    }
}

// ==========================================
// EXPORT HELPER — dipakai index.js
// ==========================================
function trackQuest(ud, type, amount = 1) {
    const changed = addProgress(ud, type, amount);
    if (!changed) return [];

    const rewards = autoClaim(ud);
    return rewards;
}

module.exports = {
    QUEST_COMMANDS,
    handleQuestInteraction,
    trackQuest,
    autoClaim,
    getQuestData,
    DAILY_QUESTS
};