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
    improvement: { emoji: '🔧', label: 'Perbaikan',   color: '#5865F2' },
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
        config.changelogMessageId = null; // reset, biar buat pesan changelog baru
        db.setUpdateConfig(guildId, config);

        return interaction.editReply({ 
            content: `✅ **Update channel diset!**\n> Channel: ${ch}\n\n💡 Pakai \`/update send\` untuk menambahkan update ke changelog.`
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
    // /update send — TAMBAH (bukan ganti)
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

        // 1. Simpan ke database dulu
        db.addUpdateHistory(guildId, version, title, content, type, interaction.user.id);

        const newEmbed = buildUpdateEmbed({
            version, title, content, type,
            author: interaction.user.username,
            timestamp: Date.now()
        });

        // 2. Coba TAMBAHKAN ke message yang sudah ada
        let addedToExisting = false;
        let targetMessageId = config.changelogMessageId;

        if (targetMessageId) {
            try {
                const existingMsg = await channel.messages.fetch(targetMessageId);
                if (existingMsg) {
                    // Ambil embed yang sudah ada
                    const currentEmbeds = Array.from(existingMsg.embeds);
                    
                    // Discord max 10 embed per message
                    if (currentEmbeds.length < 10) {
                        // TAMBAHKAN embed baru di paling atas (recent first)
                        const newEmbeds = [newEmbed, ...currentEmbeds];
                        await existingMsg.edit({ embeds: newEmbeds });
                        addedToExisting = true;
                        console.log(`📢 Update ditambahkan ke changelog (${newEmbeds.length}/10 embeds)`);
                    } else {
                        // Sudah 10 embed, buat message baru
                        console.log(`📢 Changelog penuh (10 embeds), buat message baru`);
                        addedToExisting = false;
                    }
                }
            } catch (e) {
                // Message lama sudah dihapus, buat baru
                console.log(`⚠️ Changelog message tidak ditemukan: ${e.message}`);
                addedToExisting = false;
            }
        }

        // 3. Kalau belum bisa tambah ke yang lama, buat pesan baru
        if (!addedToExisting) {
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
                console.log(`📢 Changelog message baru dibuat: ${sentMsg.id}`);
            } catch (e) {
                return interaction.editReply({ content: `❌ Gagal kirim: ${e.message}` });
            }
        }

        console.log(`📢 Update terkirim: ${version} - ${title} oleh ${interaction.user.username}`);

        return interaction.editReply({ 
            content: `✅ Update berhasil ditambahkan ke changelog!\n> **${version}** — ${title}\n> ${addedToExisting ? '*Ditambahkan ke pesan yang sudah ada*' : '*Pesan changelog baru dibuat*'}`
        });
    }

    return true;
}

module.exports = {
    UPDATE_COMMANDS,
    handleUpdateInteraction,
    buildUpdateEmbed,
    UPDATE_TYPES
};