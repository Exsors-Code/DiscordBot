const { 
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits
} = require('discord.js');

// ==========================================
// SLASH COMMANDS
// ==========================================
const UTILITY_COMMANDS = [
    // ===== WARNS =====
    new SlashCommandBuilder().setName('warn').setDescription('🛡️ Warn management')
        .addSubcommand(s => s.setName('add').setDescription('Warn user')
            .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
            .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(true).setMaxLength(500)))
        .addSubcommand(s => s.setName('list').setDescription('Lihat warns user')
            .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
        .addSubcommand(s => s.setName('clear').setDescription('Hapus semua warn user')
            .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Hapus warn by ID')
            .addIntegerOption(o => o.setName('id').setDescription('Warn ID').setRequired(true)))
        .addSubcommand(s => s.setName('all').setDescription('Lihat semua warn di server'))
        .toJSON(),

    // ===== TAGS =====
    new SlashCommandBuilder().setName('tag').setDescription('🏷️ Custom tag / command')
        .addSubcommand(s => s.setName('create').setDescription('Buat tag baru')
            .addStringOption(o => o.setName('name').setDescription('Nama tag').setRequired(true).setMaxLength(50))
            .addStringOption(o => o.setName('content').setDescription('Isi tag').setRequired(true).setMaxLength(2000)))
        .addSubcommand(s => s.setName('delete').setDescription('Hapus tag')
            .addStringOption(o => o.setName('name').setDescription('Nama tag').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List semua tag'))
        .addSubcommand(s => s.setName('show').setDescription('Tampilkan tag')
            .addStringOption(o => o.setName('name').setDescription('Nama tag').setRequired(true)))
        .toJSON(),

    // ===== REACTION ROLES =====
    new SlashCommandBuilder().setName('reactionrole').setDescription('🎭 Reaction role setup')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s => s.setName('add').setDescription('Tambah reaction role')
            .addStringOption(o => o.setName('message_id').setDescription('ID pesan').setRequired(true))
            .addStringOption(o => o.setName('emoji').setDescription('Emoji (contoh: ✅)').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Hapus reaction role')
            .addStringOption(o => o.setName('message_id').setDescription('ID pesan').setRequired(true))
            .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List semua reaction role'))
        .toJSON(),

    // ===== LOGGING =====
    new SlashCommandBuilder().setName('logging').setDescription('📜 Setup logging')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('set').setDescription('Set channel log')
            .addChannelOption(o => o.setName('channel').setDescription('Channel log').setRequired(true)))
        .addSubcommand(s => s.setName('toggle').setDescription('On/off logging'))
        .addSubcommand(s => s.setName('events').setDescription('Pilih event yang di-log')
            .addBooleanOption(o => o.setName('messages').setDescription('Log edit/delete pesan').setRequired(false))
            .addBooleanOption(o => o.setName('members').setDescription('Log join/leave member').setRequired(false))
            .addBooleanOption(o => o.setName('mod').setDescription('Log moderasi').setRequired(false)))
        .addSubcommand(s => s.setName('status').setDescription('Lihat config logging'))
        .toJSON(),

    // ===== STARBOARD =====
    new SlashCommandBuilder().setName('starboard').setDescription('⭐ Setup starboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('set').setDescription('Setup starboard')
            .addChannelOption(o => o.setName('channel').setDescription('Channel starboard').setRequired(true))
            .addStringOption(o => o.setName('emoji').setDescription('Emoji (default ⭐)').setRequired(false))
            .addIntegerOption(o => o.setName('threshold').setDescription('Minimal star (default 3)').setRequired(false).setMinValue(1).setMaxValue(50)))
        .addSubcommand(s => s.setName('toggle').setDescription('On/off starboard'))
        .addSubcommand(s => s.setName('status').setDescription('Lihat config'))
        .addSubcommand(s => s.setName('ignore').setDescription('Channel yang di-ignore')
            .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
        .toJSON(),

    // ===== AUTOMOD =====
    new SlashCommandBuilder().setName('automod').setDescription('🚨 Automod settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('toggle').setDescription('On/off automod'))
        .addSubcommand(s => s.setName('filters').setDescription('Set filter')
            .addBooleanOption(o => o.setName('anti_link').setDescription('Anti link').setRequired(false))
            .addBooleanOption(o => o.setName('anti_invite').setDescription('Anti invite Discord').setRequired(false))
            .addBooleanOption(o => o.setName('anti_spam').setDescription('Anti spam').setRequired(false))
            .addBooleanOption(o => o.setName('anti_caps').setDescription('Anti caps lock').setRequired(false)))
        .addSubcommand(s => s.setName('badwords').setDescription('Manage bad words')
            .addStringOption(o => o.setName('action').setDescription('add/remove/list').setRequired(true).addChoices(
                { name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }
            ))
            .addStringOption(o => o.setName('word').setDescription('Kata').setRequired(false)))
        .addSubcommand(s => s.setName('logchannel').setDescription('Set channel log automod')
            .addChannelOption(o => o.setName('channel').setDescription('Channel log').setRequired(true)))
        .addSubcommand(s => s.setName('exempt').setDescription('Channel/role yang di-ignore')
            .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false))
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(false)))
        .addSubcommand(s => s.setName('status').setDescription('Lihat config'))
        .toJSON(),

    // ===== MISC =====
    new SlashCommandBuilder().setName('ping').setDescription('🏓 Cek latency bot').toJSON(),
    new SlashCommandBuilder().setName('help').setDescription('❓ Bantuan command').toJSON()
];

// ==========================================
// SPAM TRACKER (in-memory)
// ==========================================
const spamTracker = new Map();

// ==========================================
// AUTOMOD CHECK
// ==========================================
async function runAutomod(message) {
    if (!message.guild || message.author.bot || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    const db = require('./database');
    const config = db.getAutomodConfig(message.guild.id);
    if (!config || !config.enabled) return false;

    const exemptChannels = (config.exemptChannels || '').split(',').filter(Boolean);
    if (exemptChannels.includes(message.channel.id)) return false;

    const exemptRoles = (config.exemptRoles || '').split(',').filter(Boolean);
    if (exemptRoles.some(rId => message.member.roles.cache.has(rId))) return false;

    const content = message.content;
    let violated = null;

    if (config.antiInvite && /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[a-z0-9]+/i.test(content)) {
        violated = 'Anti-Invite: Mengirim link invite Discord';
    }
    if (!violated && config.antiLink && /https?:\/\/[^\s]+/i.test(content)) {
        violated = 'Anti-Link: Mengirim link';
    }
    if (!violated && config.antiCaps && content.length > 10 && content === content.toUpperCase() && /[A-Z]/.test(content)) {
        violated = 'Anti-Caps: Terlalu banyak huruf kapital';
    }
    if (!violated && config.badWords) {
        const badWords = config.badWords.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
        const lower = content.toLowerCase();
        for (const w of badWords) {
            if (lower.includes(w)) { violated = `Bad Word: Mengandung kata terlarang`; break; }
        }
    }
    if (!violated && config.antiSpam) {
        const key = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        let times = spamTracker.get(key) || [];
        times = times.filter(t => now - t < 5000);
        times.push(now);
        spamTracker.set(key, times);
        if (times.length >= 6) violated = 'Anti-Spam: Terlalu banyak pesan dalam waktu singkat';
    }

    if (violated) {
        try { await message.delete(); } catch {}
        try {
            const warn = await message.channel.send(`⚠️ ${message.author}, pesan dihapus: **${violated}**`);
            setTimeout(() => warn.delete().catch(() => {}), 5000);
        } catch {}

        if (config.logChannelId) {
            const logCh = message.guild.channels.cache.get(config.logChannelId);
            if (logCh) {
                try {
                    await logCh.send({ embeds: [new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('🚨 Automod Triggered')
                        .addFields(
                            { name: 'User', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: 'Channel', value: `${message.channel}`, inline: true },
                            { name: 'Reason', value: violated, inline: false },
                            { name: 'Content', value: content.substring(0, 1024) || '*[empty]*', inline: false }
                        )
                        .setTimestamp()] });
                } catch {}
            }
        }
        return true;
    }
    return false;
}

// ==========================================
// TAG HANDLER (!tagname)
// ==========================================
async function handleTagMessage(message) {
    if (!message.guild || message.author.bot) return false;
    const content = message.content.trim();
    if (!content.startsWith('!')) return false;
    const name = content.slice(1).split(' ')[0].toLowerCase();
    if (!name || name.length > 50) return false;
    const db = require('./database');
    const tag = db.getTag(message.guild.id, name);
    if (!tag) return false;
    db.incrementTagUse(message.guild.id, name);
    try { await message.channel.send(tag.content); } catch {}
    return true;
}

// ==========================================
// REACTION ROLE HANDLER
// ==========================================
async function handleReactionAdd(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    const db = require('./database');
    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const rr = db.getReactionRole(reaction.message.id, emoji) || db.getReactionRole(reaction.message.id, reaction.emoji.name);
    if (!rr) return;
    const guild = reaction.message.guild;
    if (!guild) return;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    const role = guild.roles.cache.get(rr.roleId);
    if (!role) return;
    try { await member.roles.add(role, 'Reaction Role'); } catch {}
}

async function handleReactionRemove(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    const db = require('./database');
    const emoji = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    const rr = db.getReactionRole(reaction.message.id, emoji) || db.getReactionRole(reaction.message.id, reaction.emoji.name);
    if (!rr) return;
    const guild = reaction.message.guild;
    if (!guild) return;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    const role = guild.roles.cache.get(rr.roleId);
    if (!role) return;
    try { await member.roles.remove(role, 'Reaction Role'); } catch {}
}

// ==========================================
// STARBOARD HANDLER
// ==========================================
async function handleStarboard(reaction, user, added) {
    if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
    const message = reaction.message;
    if (!message.guild) return;
    const db = require('./database');
    const config = db.getStarboardConfig(message.guild.id);
    if (!config || !config.enabled || !config.channelId) return;

    const emojiMatch = reaction.emoji.name === config.emoji || (reaction.emoji.id && `<:${reaction.emoji.name}:${reaction.emoji.id}>` === config.emoji);
    if (!emojiMatch) return;

    const ignoreChannels = (config.ignoreChannels || '').split(',').filter(Boolean);
    if (ignoreChannels.includes(message.channel.id)) return;

    const starboardChannel = message.guild.channels.cache.get(config.channelId);
    if (!starboardChannel) return;

    const starCount = reaction.count;
    const existing = db.getStarboardMessage(message.id);
    const threshold = config.threshold;

    if (starCount >= threshold) {
        if (existing && existing.starboardMessageId) {
            db.updateStarCount(message.id, starCount);
            try {
                const sbMsg = await starboardChannel.messages.fetch(existing.starboardMessageId);
                await sbMsg.edit({ content: `${config.emoji} **${starCount}** | ${message.channel}` });
            } catch {}
        } else {
            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || '*[attachment]*')
                .setFooter({ text: `ID: ${message.id}` })
                .setTimestamp(message.createdTimestamp);
            if (message.attachments.size > 0) {
                const att = message.attachments.first();
                if (att.contentType?.startsWith('image/')) embed.setImage(att.url);
            }
            try {
                const sent = await starboardChannel.send({ content: `${config.emoji} **${starCount}** | ${message.channel}`, embeds: [embed] });
                db.saveStarboardMessage(message.id, sent.id, message.guild.id, starCount);
            } catch {}
        }
    }
}

// ==========================================
// LOGGING HANDLER
// ==========================================
async function logEvent(guild, type, data) {
    const db = require('./database');
    const config = db.getLoggingConfig(guild.id);
    if (!config || !config.enabled || !config.channelId) return;
    if (type === 'message' && !config.logMessages) return;
    if (type === 'member' && !config.logMembers) return;
    if (type === 'mod' && !config.logMod) return;
    const ch = guild.channels.cache.get(config.channelId);
    if (!ch) return;
    try { await ch.send({ embeds: [data] }); } catch {}
}

// ==========================================
// HELP — RINGKAS
// ==========================================
const HELP_DATA = [
    {
        emoji: '🌾',
        name: 'Farming & Game',
        color: '#57F287',
        cmds: [
            '/farming — Buka panel farming',
            '/event — Lihat event aktif',
            '/customevent — Set multiplier event',
            '/setup — Setup bot di server',
            '/unsetup — Hapus config bot',
            '/resetplayer — Reset data player'
        ]
    },
    {
        emoji: '📢',
        name: 'Update / Changelog',
        color: '#5865F2',
        cmds: [
            '/update send — Kirim 1 update',
            '/update sendmulti — Update multi-embed',
            '/update edit — Edit update',
            '/update delete — Hapus update + history',
            '/update reset — Reset semua update',
            '/update clearhistory — Hapus history',
            '/update setchannel — Set channel update',
            '/update history — Lihat riwayat',
            '/update status — Lihat config'
        ]
    },
    {
        emoji: '🛡️',
        name: 'Moderasi',
        color: '#ED4245',
        cmds: [
            '/kick — Kick member',
            '/ban — Ban member',
            '/unban — Unban user',
            '/timeout — Timeout member',
            '/untimeout — Hapus timeout',
            '/warn add — Warn user',
            '/warn list — Lihat warn',
            '/warn clear — Hapus warn',
            '/warn remove — Hapus warn by ID',
            '/warn all — Semua warn'
        ]
    },
    {
        emoji: '🔒',
        name: 'Channel Management',
        color: '#E67E22',
        cmds: [
            '/lock — Lock channel',
            '/unlock — Unlock channel',
            '/lockview — Sembunyikan channel',
            '/unlockview — Tampilkan channel',
            '/slowmode — Set slowmode',
            '/clear — Hapus pesan'
        ]
    },
    {
        emoji: '🎭',
        name: 'Role Management',
        color: '#9B59B6',
        cmds: [
            '/role create — Buat role',
            '/role delete — Hapus role',
            '/role rename — Rename role',
            '/role color — Ubah warna',
            '/role give — Beri role',
            '/role remove — Hapus role',
            '/role list — List role',
            '/role info — Info role'
        ]
    },
    {
        emoji: '👋',
        name: 'Welcome & Autorole',
        color: '#F1C40F',
        cmds: [
            '/welcome set-channel — Set channel welcome',
            '/welcome set-message — Set pesan welcome',
            '/welcome set-color — Set warna',
            '/welcome toggle — On/off welcome',
            '/welcome test — Test welcome',
            '/welcome status — Lihat config',
            '/autorole set — Set autorole',
            '/autorole disable — Nonaktifkan',
            '/autorole status — Lihat config',
            '/autorole apply — Apply ke semua',
            '/autorole remove — Hapus config'
        ]
    },
    {
        emoji: '🏷️',
        name: 'Tag & Reaction Role',
        color: '#3498DB',
        cmds: [
            '/tag create — Buat tag',
            '/tag delete — Hapus tag',
            '/tag list — List tag',
            '/tag show — Tampilkan tag',
            '!tagname — Trigger tag lewat chat',
            '/reactionrole add — Tambah reaction role',
            '/reactionrole remove — Hapus reaction role',
            '/reactionrole list — List reaction role'
        ]
    },
    {
        emoji: '📜',
        name: 'Logging, Starboard & Automod',
        color: '#1ABC9C',
        cmds: [
            '/logging set — Set channel log',
            '/logging toggle — On/off logging',
            '/logging events — Pilih event log',
            '/logging status — Lihat config',
            '/starboard set — Setup starboard',
            '/starboard toggle — On/off starboard',
            '/starboard status — Lihat config',
            '/starboard ignore — Ignore channel',
            '/automod toggle — On/off automod',
            '/automod filters — Set filter',
            '/automod badwords — Manage bad words',
            '/automod logchannel — Set log channel',
            '/automod exempt — Ignore channel/role',
            '/automod status — Lihat config'
        ]
    },
    {
        emoji: 'ℹ️',
        name: 'Info & Misc',
        color: '#95A5A6',
        cmds: [
            '/serverinfo — Info server',
            '/userinfo — Info user',
            '/ping — Cek latency',
            '/help — Bantuan ini'
        ]
    }
];

function buildHelpEmbeds() {
    const embeds = [];

    for (const group of HELP_DATA) {
        embeds.push(
            new EmbedBuilder()
                .setColor(group.color)
                .setTitle(`${group.emoji} ${group.name}`)
                .setDescription(group.cmds.join('\n'))
        );
    }

    if (embeds.length > 0) {
        embeds[embeds.length - 1].setFooter({ text: 'GrowExs Bot' });
    }

    return embeds;
}

// ==========================================
// MAIN HANDLER
// ==========================================
async function handleUtilityInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return false;
    const cmd = interaction.commandName;
    const commands = ['warn', 'tag', 'reactionrole', 'logging', 'starboard', 'automod', 'ping', 'help'];
    if (!commands.includes(cmd)) return false;

    const db = require('./database');

    try {
        if (cmd === 'ping') {
            return interaction.reply({ content: `🏓 Pong! WebSocket: **${interaction.client.ws.ping}ms**`, ephemeral: true });
        }

        // ===== HELP — RINGKAS =====
        if (cmd === 'help') {
            const embeds = buildHelpEmbeds();

            if (embeds.length <= 10) {
                return interaction.reply({ embeds, ephemeral: true });
            }

            await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });
            for (let i = 10; i < embeds.length; i += 10) {
                await interaction.followUp({
                    embeds: embeds.slice(i, i + 10),
                    ephemeral: true
                });
            }
            return;
        }

        // ===== WARN =====
        if (cmd === 'warn') {
            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ ephemeral: sub !== 'list' && sub !== 'all' });

            if (sub === 'add') {
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason');
                const id = db.addWarn(interaction.guildId, user.id, interaction.user.id, reason);
                try { await user.send(`⚠️ Kamu di-warn di **${interaction.guild.name}**\n> Alasan: ${reason}`).catch(() => {}); } catch {}
                return interaction.editReply({ content: `✅ **${user.tag}** di-warn (ID: ${id}).\n> ${reason}` });
            }
            if (sub === 'list') {
                const user = interaction.options.getUser('user');
                const warns = db.getWarns(interaction.guildId, user.id);
                if (warns.length === 0) return interaction.editReply({ content: `✅ **${user.tag}** tidak punya warn.` });
                const lines = warns.slice(0, 20).map(w => `**#${w.id}** • <t:${Math.floor(w.timestamp / 1000)}:R> • <@${w.modId}>\n> ${w.reason}`);
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#ED4245').setTitle(`🛡️ Warns — ${user.tag}`)
                    .setDescription(lines.join('\n\n'))
                    .setFooter({ text: `Total: ${warns.length} warn` })] });
            }
            if (sub === 'clear') {
                const user = interaction.options.getUser('user');
                db.clearWarns(interaction.guildId, user.id);
                return interaction.editReply({ content: `✅ Semua warn **${user.tag}** dihapus.` });
            }
            if (sub === 'remove') {
                const id = interaction.options.getInteger('id');
                db.removeWarn(id);
                return interaction.editReply({ content: `✅ Warn #${id} dihapus.` });
            }
            if (sub === 'all') {
                const warns = db.getAllWarns(interaction.guildId);
                if (warns.length === 0) return interaction.editReply({ content: '✅ Tidak ada warn di server.' });
                const lines = warns.slice(0, 20).map(w => `**#${w.id}** • <@${w.userId}> • ${w.reason.substring(0, 60)}`);
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#ED4245').setTitle('🛡️ All Warns')
                    .setDescription(lines.join('\n'))
                    .setFooter({ text: `Total: ${warns.length} warn` })] });
            }
        }

        // ===== TAG =====
        if (cmd === 'tag') {
            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ ephemeral: sub !== 'show' });

            if (sub === 'create') {
                const name = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
                const content = interaction.options.getString('content');
                const success = db.createTag(interaction.guildId, name, content, interaction.user.id);
                if (!success) return interaction.editReply({ content: `❌ Tag \`${name}\` sudah ada!` });
                return interaction.editReply({ content: `✅ Tag \`${name}\` dibuat!\n> Pakai dengan \`!${name}\`` });
            }
            if (sub === 'delete') {
                const name = interaction.options.getString('name').toLowerCase();
                const tag = db.getTag(interaction.guildId, name);
                if (!tag) return interaction.editReply({ content: `❌ Tag \`${name}\` tidak ditemukan.` });
                if (tag.authorId !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    return interaction.editReply({ content: `❌ Kamu bukan pembuat tag ini.` });
                }
                db.deleteTag(interaction.guildId, name);
                return interaction.editReply({ content: `✅ Tag \`${name}\` dihapus.` });
            }
            if (sub === 'list') {
                const tags = db.listTags(interaction.guildId);
                if (tags.length === 0) return interaction.editReply({ content: '❌ Belum ada tag.' });
                const lines = tags.map(t => `\`!${t.name}\` — ${t.uses} uses`);
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#5865F2').setTitle(`🏷️ Tags (${tags.length})`)
                    .setDescription(lines.slice(0, 30).join('\n'))] });
            }
            if (sub === 'show') {
                const name = interaction.options.getString('name').toLowerCase();
                const tag = db.getTag(interaction.guildId, name);
                if (!tag) return interaction.editReply({ content: `❌ Tag \`${name}\` tidak ditemukan.` });
                db.incrementTagUse(interaction.guildId, name);
                return interaction.editReply({ content: tag.content });
            }
        }

        // ===== REACTION ROLE =====
        if (cmd === 'reactionrole') {
            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ ephemeral: true });

            if (sub === 'add') {
                const messageId = interaction.options.getString('message_id');
                const emoji = interaction.options.getString('emoji');
                const role = interaction.options.getRole('role');

                if (role.position >= interaction.guild.members.me.roles.highest.position) {
                    return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });
                }

                let foundMsg = null;
                for (const ch of interaction.guild.channels.cache.values()) {
                    if (!ch.isTextBased()) continue;
                    try {
                        foundMsg = await ch.messages.fetch(messageId);
                        if (foundMsg) break;
                    } catch {}
                }
                if (!foundMsg) return interaction.editReply({ content: `❌ Pesan ID \`${messageId}\` tidak ditemukan.` });

                db.addReactionRole(messageId, interaction.guildId, foundMsg.channelId, emoji, role.id);
                try { await foundMsg.react(emoji); } catch {}
                return interaction.editReply({ content: `✅ Reaction role ditambahkan!\n> ${emoji} → ${role}` });
            }
            if (sub === 'remove') {
                const messageId = interaction.options.getString('message_id');
                const emoji = interaction.options.getString('emoji');
                db.removeReactionRole(messageId, emoji);
                return interaction.editReply({ content: `✅ Reaction role dihapus.` });
            }
            if (sub === 'list') {
                const rrs = db.listReactionRoles(interaction.guildId);
                if (rrs.length === 0) return interaction.editReply({ content: '❌ Belum ada reaction role.' });
                const lines = rrs.slice(0, 20).map(r => `Msg \`${r.messageId}\` • ${r.emoji} → <@&${r.roleId}>`);
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor('#5865F2').setTitle(`🎭 Reaction Roles (${rrs.length})`)
                    .setDescription(lines.join('\n'))] });
            }
        }

        // ===== LOGGING =====
        if (cmd === 'logging') {
            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ ephemeral: true });
            const config = db.getLoggingConfig(interaction.guildId);

            if (sub === 'set') {
                const ch = interaction.options.getChannel('channel');
                db.setLoggingConfig(interaction.guildId, { ...config, channelId: ch.id, enabled: 1 });
                return interaction.editReply({ content: `✅ Log channel → ${ch}\n> Logging **ON**` });
            }
            if (sub === 'toggle') {
                config.enabled = config.enabled ? 0 : 1;
                db.setLoggingConfig(interaction.guildId, config);
                return interaction.editReply({ content: config.enabled ? '✅ Logging **ON**' : '❌ Logging **OFF**' });
            }
            if (sub === 'events') {
                const messages = interaction.options.getBoolean('messages');
                const members = interaction.options.getBoolean('members');
                const mod = interaction.options.getBoolean('mod');
                const nc = { ...config };
                if (messages !== null) nc.logMessages = messages ? 1 : 0;
                if (members !== null) nc.logMembers = members ? 1 : 0;
                if (mod !== null) nc.logMod = mod ? 1 : 0;
                db.setLoggingConfig(interaction.guildId, nc);
                return interaction.editReply({ content: `✅ Events diupdate.` });
            }
            if (sub === 'status') {
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor(config.enabled ? '#57F287' : '#ED4245')
                    .setTitle('📜 Logging Config')
                    .addFields(
                        { name: 'Status', value: config.enabled ? '✅ ON' : '❌ OFF', inline: true },
                        { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : '*Belum*', inline: true },
                        { name: 'Messages', value: config.logMessages ? '✅' : '❌', inline: true },
                        { name: 'Members', value: config.logMembers ? '✅' : '❌', inline: true },
                        { name: 'Mod Actions', value: config.logMod ? '✅' : '❌', inline: true }
                    )] });
            }
        }

        // ===== STARBOARD =====
        if (cmd === 'starboard') {
            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ ephemeral: true });
            const config = db.getStarboardConfig(interaction.guildId);

            if (sub === 'set') {
                const ch = interaction.options.getChannel('channel');
                const emoji = interaction.options.getString('emoji') || '⭐';
                const threshold = interaction.options.getInteger('threshold') || 3;
                db.setStarboardConfig(interaction.guildId, { ...config, channelId: ch.id, emoji, threshold, enabled: 1 });
                return interaction.editReply({ content: `✅ Starboard diset!\n> Channel: ${ch}\n> Emoji: ${emoji}\n> Threshold: ${threshold}` });
            }
            if (sub === 'toggle') {
                config.enabled = config.enabled ? 0 : 1;
                db.setStarboardConfig(interaction.guildId, config);
                return interaction.editReply({ content: config.enabled ? '✅ Starboard **ON**' : '❌ Starboard **OFF**' });
            }
            if (sub === 'status') {
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor(config.enabled ? '#F1C40F' : '#ED4245')
                    .setTitle('⭐ Starboard Config')
                    .addFields(
                        { name: 'Status', value: config.enabled ? '✅ ON' : '❌ OFF', inline: true },
                        { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : '*Belum*', inline: true },
                        { name: 'Emoji', value: config.emoji, inline: true },
                        { name: 'Threshold', value: `${config.threshold}`, inline: true }
                    )] });
            }
            if (sub === 'ignore') {
                const ch = interaction.options.getChannel('channel');
                const ig = (config.ignoreChannels || '').split(',').filter(Boolean);
                if (!ig.includes(ch.id)) ig.push(ch.id);
                db.setStarboardConfig(interaction.guildId, { ...config, ignoreChannels: ig.join(',') });
                return interaction.editReply({ content: `✅ Channel ${ch} di-ignore.` });
            }
        }

        // ===== AUTOMOD =====
        if (cmd === 'automod') {
            const sub = interaction.options.getSubcommand();
            await interaction.deferReply({ ephemeral: true });
            const config = db.getAutomodConfig(interaction.guildId);

            if (sub === 'toggle') {
                config.enabled = config.enabled ? 0 : 1;
                db.setAutomodConfig(interaction.guildId, config);
                return interaction.editReply({ content: config.enabled ? '✅ Automod **ON**' : '❌ Automod **OFF**' });
            }
            if (sub === 'filters') {
                const antiLink = interaction.options.getBoolean('anti_link');
                const antiInvite = interaction.options.getBoolean('anti_invite');
                const antiSpam = interaction.options.getBoolean('anti_spam');
                const antiCaps = interaction.options.getBoolean('anti_caps');
                const nc = { ...config };
                if (antiLink !== null) nc.antiLink = antiLink ? 1 : 0;
                if (antiInvite !== null) nc.antiInvite = antiInvite ? 1 : 0;
                if (antiSpam !== null) nc.antiSpam = antiSpam ? 1 : 0;
                if (antiCaps !== null) nc.antiCaps = antiCaps ? 1 : 0;
                db.setAutomodConfig(interaction.guildId, nc);
                return interaction.editReply({ content: `✅ Filters diupdate.` });
            }
            if (sub === 'badwords') {
                const action = interaction.options.getString('action');
                const word = interaction.options.getString('word');
                let words = (config.badWords || '').split(',').map(w => w.trim()).filter(Boolean);
                if (action === 'add') {
                    if (!word) return interaction.editReply({ content: '❌ Masukkan kata.' });
                    const w = word.toLowerCase().trim();
                    if (!words.includes(w)) words.push(w);
                } else if (action === 'remove') {
                    if (!word) return interaction.editReply({ content: '❌ Masukkan kata.' });
                    words = words.filter(w => w !== word.toLowerCase().trim());
                } else if (action === 'list') {
                    return interaction.editReply({ content: words.length === 0 ? '❌ Tidak ada bad words.' : `**Bad Words (${words.length}):**\n\`\`\`${words.join(', ')}\`\`\`` });
                }
                db.setAutomodConfig(interaction.guildId, { ...config, badWords: words.join(',') });
                return interaction.editReply({ content: `✅ Bad words diupdate. Total: ${words.length}` });
            }
            if (sub === 'logchannel') {
                const ch = interaction.options.getChannel('channel');
                db.setAutomodConfig(interaction.guildId, { ...config, logChannelId: ch.id });
                return interaction.editReply({ content: `✅ Log channel → ${ch}` });
            }
            if (sub === 'exempt') {
                const ch = interaction.options.getChannel('channel');
                const role = interaction.options.getRole('role');
                const nc = { ...config };
                if (ch) {
                    const ec = (nc.exemptChannels || '').split(',').filter(Boolean);
                    if (!ec.includes(ch.id)) ec.push(ch.id);
                    nc.exemptChannels = ec.join(',');
                }
                if (role) {
                    const er = (nc.exemptRoles || '').split(',').filter(Boolean);
                    if (!er.includes(role.id)) er.push(role.id);
                    nc.exemptRoles = er.join(',');
                }
                db.setAutomodConfig(interaction.guildId, nc);
                return interaction.editReply({ content: `✅ Exempt diupdate.` });
            }
            if (sub === 'status') {
                return interaction.editReply({ embeds: [new EmbedBuilder()
                    .setColor(config.enabled ? '#57F287' : '#ED4245')
                    .setTitle('🚨 Automod Config')
                    .addFields(
                        { name: 'Status', value: config.enabled ? '✅ ON' : '❌ OFF', inline: true },
                        { name: 'Anti-Link', value: config.antiLink ? '✅' : '❌', inline: true },
                        { name: 'Anti-Invite', value: config.antiInvite ? '✅' : '❌', inline: true },
                        { name: 'Anti-Spam', value: config.antiSpam ? '✅' : '❌', inline: true },
                        { name: 'Anti-Caps', value: config.antiCaps ? '✅' : '❌', inline: true },
                        { name: 'Bad Words', value: `${(config.badWords || '').split(',').filter(Boolean).length} kata`, inline: true }
                    )] });
            }
        }

        return true;
    } catch (err) {
        console.error(`❌ [utility ${cmd}] Error:`, err);
        try {
            const content = `❌ Error: \`${err.message}\``;
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content }).catch(() => {});
            else await interaction.reply({ content, ephemeral: true }).catch(() => {});
        } catch {}
        return true;
    }
}

module.exports = {
    UTILITY_COMMANDS,
    handleUtilityInteraction,
    handleTagMessage,
    runAutomod,
    handleReactionAdd,
    handleReactionRemove,
    handleStarboard,
    logEvent
};