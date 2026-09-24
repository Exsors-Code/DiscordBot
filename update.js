const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ==========================================
// SLASH COMMANDS
// ==========================================
const UPDATE_COMMANDS = [
    new SlashCommandBuilder()
        .setName('update')
        .setDescription('📢 Update bot — tambahkan changelog ke channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(s => s
            .setName('send')
            .setDescription('Tambah update ke changelog')
            .addStringOption(o => o.setName('version').setDescription('Versi (contoh: v1.0.1)').setRequired(true).setMaxLength(20))
            .addStringOption(o => o.setName('title').setDescription('Judul update').setRequired(true).setMaxLength(200))
            .addStringOption(o => o.setName('content').setDescription('Isi update (boleh multi-baris)').setRequired(true).setMaxLength(4000))
            .addStringOption(o => o.setName('type').setDescription('Tipe update').setRequired(false).addChoices(
                { name: '🆕 Fitur Baru', value: 'feature' },
                { name: '🐛 Bug Fix', value: 'bugfix' },
                { name: '🔧 Perbaikan', value: 'improvement' },
                { name: '⚡ Performance', value: 'perf' },
                { name: '🔥 Hotfix', value: 'hotfix' },
                { name: '🔒 Security', value: 'security' }
            ))
            .addStringOption(o => o.setName('mention').setDescription('Mention user?').setRequired(false).addChoices(
                { name: 'Ya, @everyone', value: 'everyone' },
                { name: 'Ya, @here', value: 'here' },
                { name: 'Tidak', value: 'none' }
            ))
        )
        // ===== BARU =====
        .addSubcommand(s => s
            .setName('sendmulti')
            .setDescription('📦 Kirim update yang otomatis dipisah jadi beberapa embed')
            .addStringOption(o => o.setName('version').setDescription('Versi (contoh: v1.0)').setRequired(true).setMaxLength(20))
            .addStringOption(o => o.setName('title').setDescription('Judul utama (fallback)').setRequired(true).setMaxLength(200))
            .addStringOption(o => o.setName('content').setDescription('Isi update — pisahkan pakai "### Judul Section"').setRequired(true).setMaxLength(4000))
            .addStringOption(o => o.setName('type').setDescription('Tipe update').setRequired(false).addChoices(
                { name: '🆕 Fitur Baru', value: 'feature' },
                { name: '🐛 Bug Fix', value: 'bugfix' },
                { name: '🔧 Perbaikan', value: 'improvement' },
                { name: '⚡ Performance', value: 'perf' },
                { name: '🔥 Hotfix', value: 'hotfix' },
                { name: '🔒 Security', value: 'security' }
            ))
            .addStringOption(o => o.setName('mention').setDescription('Mention user? (cuma di embed pertama)').setRequired(false).addChoices(
                { name: 'Ya, @everyone', value: 'everyone' },
                { name: 'Ya, @here', value: 'here' },
                { name: 'Tidak', value: 'none' }
            ))
        )
        // ===== END BARU =====
        .addSubcommand(s => s
            .setName('setchannel')
            .setDescription('Set channel untuk changelog')
            .addChannelOption(o => o.setName('channel').setDescription('Channel update').setRequired(true))
        )
        .addSubcommand(s => s
            .setName('reset')
            .setDescription('Reset changelog — mulai pesan baru')
        )
        .addSubcommand(s => s
            .setName('history')
            .setDescription('Lihat history update')
        )
        .addSubcommand(s => s
            .setName('status')
            .setDescription('Lihat config update')
        )
        .toJSON()
];

// ==========================================
// TYPE CONFIG
// ==========================================
const UPDATE_TYPES = {
    feature:     { emoji: '🆕', label: 'Fitur Baru',  color: '#57F287' },
    bugfix:      { emoji: '🐛', label: 'Bug Fix',     color: '#ED4245' },
    improvement: { emoji: '🔧', label: 'Perbaikan',   color: '#5867F2' },
    perf:        { emoji: '⚡', label: 'Performance', color: '#F1C40F' },
    hotfix:      { emoji: '🔥', label: 'Hotfix',      color: '#E67E22' },
    security:    { emoji: '🔒', label: 'Security',    color: '#9B59B6' }
};

// ==========================================
// BUILD EMBED
// ==========================================
function buildUpdateEmbed({ version, title, content, type, author, timestamp }) {
    const cfg = UPDATE_TYPES[type] || UPDATE_TYPES.improvement;
    return new EmbedBuilder()
        .setColor(cfg.color)
        .setTitle(`${cfg.emoji} ${cfg.label} — ${version}`)
        .setDescription(`### ${title}\n\n${content}`)
        .setFooter({ text: `Update by ${author} • GrowExs Bot` })
        .setTimestamp(timestamp || Date.now());
}

// ==========================================
// BARU — SPLIT CONTENT JADI SECTIONS
// ==========================================
// Marker yang didukung di content:
//   "### Judul Section"
//   "== Judul Section =="
//   "--- Judul Section ---"
// Kalau tidak ada marker, seluruh content jadi 1 section.
function splitContent(raw) {
    const lines = raw.split('\n');
    const sections = [];
    let currentTitle = null;
    let currentLines = [];

    const isHeader = (line) => {
        const t = line.trim();
        if (/^###\s+/.test(t)) return t.replace(/^###\s+/, '').trim();
        if (/^==\s+.+\s+==$/.test(t)) return t.replace(/^==\s+/, '').replace(/\s+==$/, '').trim();
        if (/^---\s+.+\s+---$/.test(t)) return t.replace(/^---\s+/, '').replace(/\s+---$/, '').trim();
        return null;
    };

    for (const line of lines) {
        const h = isHeader(line);
        if (h !== null) {
            if (currentLines.length > 0 || currentTitle !== null) {
                sections.push({ title: currentTitle, body: currentLines.join('\n').trim() });
            }
            currentTitle = h;
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }
    if (currentLines.length > 0 || currentTitle !== null) {
        sections.push({ title: currentTitle, body: currentLines.join('\n').trim() });
    }

    return sections.filter(s => s.body.length > 0 || s.title);
}
// ==========================================
// END BARU
// ==========================================

// ==========================================
// HANDLER
// ==========================================
async function handleUpdateInteraction(interaction) {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'update') return false;
    const db = require('./database');
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // ==========================================
    // /update setchannel
    // ==========================================
    if (sub === 'setchannel') {
        await interaction.deferReply({ ephemeral: true });
        const ch = interaction.options.getChannel('channel');
        if (!ch.isTextBased()) return interaction.editReply({ content: '❌ Harus channel text.' });

        const config = db.getUpdateConfig(guildId) || {};
        config.channelId = ch.id;
        config.changelogMessageId = null;
        db.setUpdateConfig(guildId, config);

        return interaction.editReply({
            content: `✅ **Update channel diset!**\n> Channel: ${ch}\n\n💡 Pakai \`/update send\` atau \`/update sendmulti\`.`
        });
    }

    // ==========================================
    // /update reset
    // ==========================================
    if (sub === 'reset') {
        await interaction.deferReply({ ephemeral: true });
        const config = db.getUpdateConfig(guildId);
        if (!config) return interaction.editReply({ content: '❌ Belum di-setup.' });
        db.setChangelogMessageId(guildId, null);
        return interaction.editReply({ content: `✅ Changelog di-reset. Update berikutnya akan mulai pesan baru.\n> Pesan lama tetap tersimpan di channel.` });
    }

    // ==========================================
    // /update status
    // ==========================================
    if (sub === 'status') {
        await interaction.deferReply({ ephemeral: true });
        const config = db.getUpdateConfig(guildId);
        const count = db.getUpdateHistory(guildId, 1000).length;
        if (!config || !config.channelId) {
            return interaction.editReply({ content: `❌ Belum di-setup.\n> Pakai \`/update setchannel #channel\`.` });
        }
        return interaction.editReply({ embeds: [new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📢 Update Config')
            .addFields(
                { name: '📌 Channel', value: `<#${config.channelId}>`, inline: true },
                { name: '📊 Total Update', value: `${count}`, inline: true },
                { name: '📝 Changelog Msg', value: config.changelogMessageId ? `\`${config.changelogMessageId}\`` : '*Belum ada*', inline: false }
            )
        ] });
    }

    // ==========================================
    // /update history
    // ==========================================
    if (sub === 'history') {
        await interaction.deferReply({ ephemeral: true });
        const history = db.getUpdateHistory(guildId, 10);
        if (history.length === 0) return interaction.editReply({ content: '❌ Belum ada history update.' });

        const lines = history.map((h, i) => {
            const cfg = UPDATE_TYPES[h.type] || UPDATE_TYPES.improvement;
            return `**${i + 1}.** ${cfg.emoji} \`${h.version}\` — **${h.title}**\n> <t:${Math.floor(h.timestamp / 1000)}:R> oleh <@${h.authorId}>`;
        });

        return interaction.editReply({ embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📢 History Update (${history.length})`)
            .setDescription(lines.join('\n\n'))
        ] });
    }

    // ==========================================
    // /update send — SIMPLE (1 PESAN, 1 EMBED)
    // ==========================================
    if (sub === 'send') {
        await interaction.deferReply({ ephemeral: true });
        const config = db.getUpdateConfig(guildId);
        if (!config || !config.channelId) {
            return interaction.editReply({ content: `❌ Set channel dulu dengan \`/update setchannel #channel\`.` });
        }

        const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });

        const version = interaction.options.getString('version');
        const title = interaction.options.getString('title');
        const content = interaction.options.getString('content');
        const type = interaction.options.getString('type') || 'improvement';
        const mention = interaction.options.getString('mention') || 'none';

        db.addUpdateHistory(guildId, version, title, content, type, interaction.user.id);

        const newEmbed = buildUpdateEmbed({
            version, title, content, type,
            author: interaction.user.username,
            timestamp: Date.now()
        });

        let mentionText = '';
        if (mention === 'everyone') mentionText = '@everyone';
        else if (mention === 'here') mentionText = '@here';

        try {
            const sentMsg = await channel.send({
                content: mentionText || null,
                embeds: [newEmbed],
                allowedMentions: mentionText ? { parse: ['everyone'] } : { parse: [] }
            });
            db.setChangelogMessageId(guildId, sentMsg.id);
            console.log(`📢 Update terkirim: ${version} - ${title} oleh ${interaction.user.username}`);
        } catch (e) {
            return interaction.editReply({ content: `❌ Gagal kirim: ${e.message}` });
        }

        return interaction.editReply({
            content: `✅ Update terkirim!\n> **${version}** — ${title}\n> 📦 1 embed dikirim.`
        });
    }

    // ==========================================
    // BARU — /update sendmulti
    // ==========================================
    if (sub === 'sendmulti') {
        await interaction.deferReply({ ephemeral: true });
        const config = db.getUpdateConfig(guildId);
        if (!config || !config.channelId) {
            return interaction.editReply({ content: `❌ Set channel dulu dengan \`/update setchannel #channel\`.` });
        }

        const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });

        const version = interaction.options.getString('version');
        const title = interaction.options.getString('title');
        const content = interaction.options.getString('content');
        const type = interaction.options.getString('type') || 'improvement';
        const mention = interaction.options.getString('mention') || 'none';

        const sections = splitContent(content);

        if (sections.length === 0) {
            return interaction.editReply({ content: `❌ Content kosong.` });
        }

        // Kalau cuma 1 section, anggap sama seperti /update send
        if (sections.length === 1 && sections[0].title === null) {
            return interaction.editReply({
                content: `⚠️ Tidak ada marker \`###\` yang ditemukan.\n> Pakai \`/update send\` untuk update biasa, atau tambahkan marker \`### Judul\` untuk pisah embed.`
            });
        }

        let mentionText = '';
        if (mention === 'everyone') mentionText = '@everyone';
        else if (mention === 'here') mentionText = '@here';

        const cfg = UPDATE_TYPES[type] || UPDATE_TYPES.improvement;
        let sentCount = 0;

        try {
            for (let i = 0; i < sections.length; i++) {
                const sec = sections[i];
                const secTitle = sec.title || title;

                const embed = new EmbedBuilder()
                    .setColor(cfg.color)
                    .setTitle(`${cfg.emoji} ${cfg.label} — ${version}`)
                    .setDescription(`### ${secTitle}\n\n${sec.body}`)
                    .setFooter({ text: `Update by ${interaction.user.username} • GrowExs Bot` })
                    .setTimestamp();

                // ===== Auto-mention cuma di embed pertama =====
                const isFirst = i === 0;
                await channel.send({
                    content: isFirst ? (mentionText || null) : null,
                    embeds: [embed],
                    allowedMentions: isFirst && mentionText ? { parse: ['everyone'] } : { parse: [] }
                });

                sentCount++;
                await new Promise(r => setTimeout(r, 1200));
            }

            db.addUpdateHistory(guildId, version, title, content, type, interaction.user.id);
            console.log(`📢 sendmulti: ${version} — ${sentCount} embed oleh ${interaction.user.username}`);

            return interaction.editReply({
                content: `✅ **Update multi-embed terkirim!**\n> **${version}** — ${title}\n> 📦 **${sentCount}** embed terpisah dikirim.\n> 🔔 Mention cuma di embed pertama.`
            });
        } catch (e) {
            return interaction.editReply({ content: `❌ Gagal kirim: ${e.message}` });
        }
    }
    // ==========================================
    // END BARU
    // ==========================================

    return true;
}

module.exports = {
    UPDATE_COMMANDS,
    handleUpdateInteraction,
    buildUpdateEmbed,
    UPDATE_TYPES,
    splitContent // BARU — biar bisa dipakai file lain kalau perlu
};