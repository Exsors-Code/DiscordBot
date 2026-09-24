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
            .setName('sendmulti')
            .setDescription('📦 Kirim update multi-embed (pisah pakai "### Judul")')
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
            .addStringOption(o => o.setName('mention').setDescription('Mention? (cuma di embed pertama)').setRequired(false).addChoices(
                { name: 'Ya, @everyone', value: 'everyone' },
                { name: 'Ya, @here', value: 'here' },
                { name: 'Tidak', value: 'none' }
            ))
        )
        .addSubcommand(s => s
            .setName('edit')
            .setDescription('✏️ Edit update yang sudah dikirim')
            .addStringOption(o => o.setName('message_id').setDescription('ID pesan update yang mau diedit').setRequired(true))
            .addStringOption(o => o.setName('version').setDescription('Versi baru (kosongkan kalau tidak diubah)').setRequired(false).setMaxLength(20))
            .addStringOption(o => o.setName('title').setDescription('Judul baru').setRequired(false).setMaxLength(200))
            .addStringOption(o => o.setName('content').setDescription('Isi baru').setRequired(false).setMaxLength(4000))
            .addStringOption(o => o.setName('type').setDescription('Tipe baru').setRequired(false).addChoices(
                { name: '🆕 Fitur Baru', value: 'feature' },
                { name: '🐛 Bug Fix', value: 'bugfix' },
                { name: '🔧 Perbaikan', value: 'improvement' },
                { name: '⚡ Performance', value: 'perf' },
                { name: '🔥 Hotfix', value: 'hotfix' },
                { name: '🔒 Security', value: 'security' }
            ))
        )
        .addSubcommand(s => s
            .setName('delete')
            .setDescription('🗑️ Hapus update + history-nya')
            .addStringOption(o => o.setName('message_id').setDescription('ID pesan update yang mau dihapus').setRequired(true))
            .addBooleanOption(o => o.setName('delete_history').setDescription('Hapus juga dari history? (default: ya)').setRequired(false))
        )
        .addSubcommand(s => s
            .setName('reset')
            .setDescription('🔄 Reset — hapus semua pesan update lama + history')
            .addBooleanOption(o => o.setName('confirm').setDescription('Yakin? (wajib true)').setRequired(true))
            .addBooleanOption(o => o.setName('delete_messages').setDescription('Hapus pesan update lama? (default: ya)').setRequired(false))
            .addBooleanOption(o => o.setName('delete_history').setDescription('Hapus history database? (default: ya)').setRequired(false))
        )
        .addSubcommand(s => s
            .setName('clearhistory')
            .setDescription('🧹 Hapus semua history update di server ini')
            .addBooleanOption(o => o.setName('confirm').setDescription('Yakin? (wajib true)').setRequired(true))
        )
        .addSubcommand(s => s
            .setName('setchannel')
            .setDescription('Set channel untuk changelog')
            .addChannelOption(o => o.setName('channel').setDescription('Channel update').setRequired(true))
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
// SPLIT CONTENT JADI SECTIONS
// ==========================================
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
// HELPER — CEK APAKAH EMBED INI UPDATE EMBED
// ==========================================
function isUpdateEmbed(embed) {
    if (!embed || !embed.title) return false;
    const emojis = Object.values(UPDATE_TYPES).map(t => t.emoji);
    const hasEmoji = emojis.some(e => embed.title.includes(e));
    const hasDash = embed.title.includes('—');
    return hasEmoji && hasDash;
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
        config.changelogMessageId = null;
        db.setUpdateConfig(guildId, config);

        return interaction.editReply({
            content: `✅ **Update channel diset!**\n> Channel: ${ch}\n\n💡 Pakai \`/update send\` atau \`/update sendmulti\`.`
        });
    }

    // ==========================================
    // /update reset — HAPUS PESAN + HISTORY
    // ==========================================
    if (sub === 'reset') {
        await interaction.deferReply({ ephemeral: true });

        const config = db.getUpdateConfig(guildId);
        if (!config || !config.channelId) {
            return interaction.editReply({ content: `❌ Belum di-setup.\n> Pakai \`/update setchannel #channel\` dulu.` });
        }

        const confirm = interaction.options.getBoolean('confirm');
        if (!confirm) {
            return interaction.editReply({
                content: `⚠️ **Konfirmasi diperlukan!**\n> Set \`confirm:true\` kalau yakin.\n\n> Yang akan dihapus:\n> • Pesan update lama di channel\n> • History database`
            });
        }

        const deleteMessages = interaction.options.getBoolean('delete_messages') !== false;
        const deleteHistory = interaction.options.getBoolean('delete_history') !== false;

        const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });

        let deletedMsgs = 0;
        let failedMsgs = 0;

        // 1. Hapus tracked changelog message
        if (deleteMessages && config.changelogMessageId) {
            try {
                const msg = await channel.messages.fetch(config.changelogMessageId);
                await msg.delete();
                deletedMsgs++;
            } catch (e) {
                // Pesan sudah tidak ada, skip
            }
        }

        // 2. Fetch pesan terbaru & hapus semua update embed dari bot
        if (deleteMessages) {
            try {
                const messages = await channel.messages.fetch({ limit: 100 });
                for (const msg of messages.values()) {
                    if (msg.author.id !== interaction.client.user.id) continue;
                    if (msg.embeds.length === 0) continue;

                    // Cek apakah ini update embed
                    const isUpdate = msg.embeds.some(e => isUpdateEmbed(e));
                    if (!isUpdate) continue;

                    try {
                        await msg.delete();
                        deletedMsgs++;
                        await new Promise(r => setTimeout(r, 300));
                    } catch (e) {
                        failedMsgs++;
                    }
                }
            } catch (e) {
                console.error('Fetch messages error:', e.message);
            }
        }

        // 3. Hapus history database
        let historyCleared = false;
        let historyCount = 0;
        if (deleteHistory) {
            try {
                historyCount = db.getUpdateHistory(guildId, 1000).length;
                db.clearUpdateHistory(guildId);
                historyCleared = true;
            } catch (e) {
                console.error('Clear history error:', e.message);
            }
        }

        // 4. Reset changelogMessageId
        db.setChangelogMessageId(guildId, null);

        console.log(`🔄 Reset: ${deletedMsgs} pesan dihapus, ${historyCount} history dibersihkan oleh ${interaction.user.username}`);

        return interaction.editReply({
            content:
                `✅ **Reset selesai!**\n\n` +
                `> 🗑️ Pesan terhapus: **${deletedMsgs}**${failedMsgs > 0 ? ` (gagal: ${failedMsgs})` : ''}\n` +
                `> 📚 History: ${historyCleared ? `**${historyCount}** update dibersihkan` : 'tidak dihapus'}\n` +
                `> 🔄 Changelog di-reset. Update berikutnya akan mulai dari awal.`
        });
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
        const history = db.getUpdateHistory(guildId, 15);
        if (history.length === 0) return interaction.editReply({ content: '❌ Belum ada history update.' });

        const lines = history.map((h, i) => {
            const cfg = UPDATE_TYPES[h.type] || UPDATE_TYPES.improvement;
            return `**${i + 1}.** ${cfg.emoji} \`${h.version}\` — **${h.title}**\n> 🆔 \`${h.id}\` • <t:${Math.floor(h.timestamp / 1000)}:R> oleh <@${h.authorId}>`;
        });

        return interaction.editReply({ embeds: [new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📢 History Update (${history.length})`)
            .setDescription(lines.join('\n\n'))
            .setFooter({ text: 'Gunakan 🆔 ID untuk /update edit atau /update delete' })
        ] });
    }

    // ==========================================
    // /update send — SIMPLE
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

        let mentionText = '';
        if (mention === 'everyone') mentionText = '@everyone';
        else if (mention === 'here') mentionText = '@here';

        const embed = buildUpdateEmbed({
            version, title, content, type,
            author: interaction.user.username,
            timestamp: Date.now()
        });

        try {
            const sentMsg = await channel.send({
                content: mentionText || null,
                embeds: [embed],
                allowedMentions: mentionText ? { parse: ['everyone'] } : { parse: [] }
            });
            db.addUpdateHistory(guildId, version, title, content, type, interaction.user.id);
            db.setChangelogMessageId(guildId, sentMsg.id);
            console.log(`📢 Update terkirim: ${version} - ${title}`);
        } catch (e) {
            return interaction.editReply({ content: `❌ Gagal kirim: ${e.message}` });
        }

        return interaction.editReply({
            content: `✅ Update terkirim!\n> **${version}** — ${title}\n> 📦 1 embed dikirim.`
        });
    }

    // ==========================================
    // /update sendmulti — MULTI EMBED
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

        if (sections.length === 1 && sections[0].title === null) {
            return interaction.editReply({
                content: `⚠️ Tidak ada marker \`###\` yang ditemukan.\n> Pakai \`/update send\` untuk update biasa, atau tambahkan marker \`### Judul\`.`
            });
        }

        let mentionText = '';
        if (mention === 'everyone') mentionText = '@everyone';
        else if (mention === 'here') mentionText = '@here';

        await interaction.editReply({
            content: `⏳ Mengirim **${sections.length}** section...\n> Mohon tunggu...`
        });

        let sentCount = 0;
        let firstMsgId = null;

        try {
            for (let i = 0; i < sections.length; i++) {
                const sec = sections[i];
                const secTitle = sec.title || title;

                const embed = buildUpdateEmbed({
                    version,
                    title: secTitle,
                    content: sec.body,
                    type,
                    author: interaction.user.username,
                    timestamp: Date.now()
                });

                const isFirst = i === 0;
                const sent = await channel.send({
                    content: isFirst ? (mentionText || null) : null,
                    embeds: [embed],
                    allowedMentions: isFirst && mentionText ? { parse: ['everyone'] } : { parse: [] }
                });

                if (isFirst) firstMsgId = sent.id;

                sentCount++;
                await new Promise(r => setTimeout(r, 1500));
            }

            db.addUpdateHistory(guildId, version, title, content, type, interaction.user.id);
            if (firstMsgId) db.setChangelogMessageId(guildId, firstMsgId);

            return interaction.editReply({
                content: `✅ **Update multi-embed terkirim!**\n> **${version}** — ${title}\n> 📦 **${sentCount}** section (embed terpisah)`
            });
        } catch (e) {
            return interaction.editReply({ content: `❌ Gagal kirim: ${e.message}` });
        }
    }

    // ==========================================
    // /update edit
    // ==========================================
    if (sub === 'edit') {
        await interaction.deferReply({ ephemeral: true });
        const config = db.getUpdateConfig(guildId);
        if (!config || !config.channelId) {
            return interaction.editReply({ content: `❌ Set channel dulu.` });
        }

        const messageId = interaction.options.getString('message_id');
        const newVersion = interaction.options.getString('version');
        const newTitle = interaction.options.getString('title');
        const newContent = interaction.options.getString('content');
        const newType = interaction.options.getString('type');

        const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });

        let targetMsg = null;
        try {
            targetMsg = await channel.messages.fetch(messageId);
        } catch {
            return interaction.editReply({ content: `❌ Pesan dengan ID \`${messageId}\` tidak ditemukan di <#${config.channelId}>.` });
        }

        const oldEmbeds = Array.from(targetMsg.embeds);
        if (oldEmbeds.length === 0) {
            return interaction.editReply({ content: `❌ Pesan tersebut tidak punya embed.` });
        }

        const oldEmbed = oldEmbeds[0];
        const oldTitleRaw = oldEmbed.title || '';
        const oldVersionMatch = oldTitleRaw.match(/—\s*(v[\d.]+)/);
        const oldVersion = oldVersionMatch ? oldVersionMatch[1] : 'v?.?';
        const oldTypeKey = Object.keys(UPDATE_TYPES).find(k => oldTitleRaw.includes(UPDATE_TYPES[k].label)) || 'improvement';
        const oldDesc = oldEmbed.description || '';
        const oldTitleMatch = oldDesc.match(/^###\s+(.+)/m);
        const oldTitle = oldTitleMatch ? oldTitleMatch[1].trim() : 'Update';
        const oldContent = oldDesc.replace(/^###\s+.+\n+/, '').trim();

        const finalVersion = newVersion || oldVersion;
        const finalTitle = newTitle || oldTitle;
        const finalContent = newContent || oldContent;
        const finalType = newType || oldTypeKey;

        const newEmbed = buildUpdateEmbed({
            version: finalVersion,
            title: finalTitle,
            content: finalContent,
            type: finalType,
            author: interaction.user.username,
            timestamp: Date.now()
        });

        try {
            await targetMsg.edit({ embeds: [newEmbed] });
        } catch (e) {
            return interaction.editReply({ content: `❌ Gagal edit pesan: ${e.message}` });
        }

        try {
            const history = db.getUpdateHistory(guildId, 1000);
            const match = history.find(h => h.version === oldVersion && h.title === oldTitle);
            if (match) {
                db.updateHistoryEntry(match.id, {
                    version: finalVersion,
                    title: finalTitle,
                    content: finalContent,
                    type: finalType
                });
            }
        } catch (e) {
            console.error('Update history error:', e.message);
        }

        return interaction.editReply({
            content: `✅ **Update berhasil diedit!**\n> **${finalVersion}** — ${finalTitle}\n> 🆔 Message: \`${messageId}\``
        });
    }

    // ==========================================
    // /update delete
    // ==========================================
    if (sub === 'delete') {
        await interaction.deferReply({ ephemeral: true });
        const config = db.getUpdateConfig(guildId);
        if (!config || !config.channelId) {
            return interaction.editReply({ content: `❌ Set channel dulu.` });
        }

        const messageId = interaction.options.getString('message_id');
        const deleteHistory = interaction.options.getBoolean('delete_history') !== false;

        const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });

        let targetMsg = null;
        try {
            targetMsg = await channel.messages.fetch(messageId);
        } catch {
            return interaction.editReply({ content: `❌ Pesan dengan ID \`${messageId}\` tidak ditemukan.` });
        }

        let delVersion = null;
        let delTitle = null;
        const oldEmbeds = Array.from(targetMsg.embeds);
        if (oldEmbeds.length > 0) {
            const oldEmbed = oldEmbeds[0];
            const oldTitleRaw = oldEmbed.title || '';
            const oldVersionMatch = oldTitleRaw.match(/—\s*(v[\d.]+)/);
            delVersion = oldVersionMatch ? oldVersionMatch[1] : null;
            const oldDesc = oldEmbed.description || '';
            const oldTitleMatch = oldDesc.match(/^###\s+(.+)/m);
            delTitle = oldTitleMatch ? oldTitleMatch[1].trim() : null;
        }

        try {
            await targetMsg.delete();
        } catch (e) {
            return interaction.editReply({ content: `❌ Gagal hapus pesan: ${e.message}` });
        }

        let historyDeleted = false;
        if (deleteHistory && delVersion && delTitle) {
            try {
                db.deleteUpdateHistoryByVersion(guildId, delVersion, delTitle);
                historyDeleted = true;
            } catch (e) {
                console.error('Delete history error:', e.message);
            }
        }

        return interaction.editReply({
            content: `✅ **Update berhasil dihapus!**\n> 🆔 Message: \`${messageId}\`\n> 🗑️ Pesan: **terhapus**\n> 📚 History: ${historyDeleted ? '**terhapus**' : 'tidak dihapus (tidak ditemukan / opsi off)'}`
        });
    }

    // ==========================================
    // /update clearhistory
    // ==========================================
    if (sub === 'clearhistory') {
        await interaction.deferReply({ ephemeral: true });
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            return interaction.editReply({
                content: `⚠️ **Konfirmasi diperlukan!**\n> Set \`confirm:true\` kalau yakin mau hapus semua history.\n\n> Yang dihapus: **history database** saja.\n> Pesan embed di channel **TIDAK** dihapus.`
            });
        }

        const before = db.getUpdateHistory(guildId, 1000).length;
        db.clearUpdateHistory(guildId);
        const after = db.getUpdateHistory(guildId, 1000).length;

        return interaction.editReply({
            content: `✅ **History dibersihkan!**\n> Sebelum: **${before}** update\n> Sesudah: **${after}** update\n\n> ℹ️ Pesan embed di channel **TIDAK** ikut terhapus.\n> Kalau mau hapus pesan, pakai \`/update reset\`.`
        });
    }

    return true;
}

module.exports = {
    UPDATE_COMMANDS,
    handleUpdateInteraction,
    buildUpdateEmbed,
    UPDATE_TYPES,
    splitContent
};