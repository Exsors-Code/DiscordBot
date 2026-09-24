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
    new SlashCommandBuilder().setName('help').setDescription('❓ Bantuan command — semua command & subcommand').toJSON()
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
// BARU — HELP DATA
// ==========================================
const HELP_DATA = [
    {
        category: '🌾 Farming & Game',
        color: '#57F287',
        commands: [
            { cmd: '/farming', desc: 'Buka panel farming pribadi (private thread)' },
            { cmd: '/event', desc: 'Lihat event aktif saat ini' },
            { cmd: '/customevent', desc: 'Set multiplier Gems & Blocks (Event Manager / Admin)' },
            { cmd: '/setup', desc: 'Setup panel & leaderboard untuk server ini' },
            { cmd: '/unsetup', desc: 'Hapus konfigurasi bot untuk server ini' },
            { cmd: '/resetplayer', desc: 'Reset semua data player (admin)' }
        ]
    },
    {
        category: '📢 Update / Changelog',
        color: '#5865F2',
        commands: [
            { cmd: '/update send', desc: 'Kirim 1 update (1 embed)' },
            { cmd: '/update sendmulti', desc: 'Kirim update multi-embed — pisah pakai "### Judul"' },
            { cmd: '/update edit', desc: 'Edit update yang sudah dikirim (by message ID)' },
            { cmd: '/update delete', desc: 'Hapus update + history-nya' },
            { cmd: '/update reset', desc: 'Hapus semua pesan update lama + history' },
            { cmd: '/update clearhistory', desc: 'Hapus history saja (pesan tetap)' },
            { cmd: '/update setchannel', desc: 'Set channel untuk changelog' },
            { cmd: '/update history', desc: 'Lihat riwayat update' },
            { cmd: '/update status', desc: 'Lihat config update' }
        ]
    },
    {
        category: '🛡️ Moderasi',
        color: '#ED4245',
        commands: [
            { cmd: '/kick', desc: 'Kick member dari server' },
            { cmd: '/ban', desc: 'Ban member (+ hapus pesan 0-7 hari)' },
            { cmd: '/unban', desc: 'Unban user by ID' },
            { cmd: '/timeout', desc: 'Timeout member (5m, 1h, 1d, dll)' },
            { cmd: '/untimeout', desc: 'Hapus timeout member' },
            { cmd: '/warn add', desc: 'Beri warn ke user' },
            { cmd: '/warn list', desc: 'Lihat warns user' },
            { cmd: '/warn clear', desc: 'Hapus semua warn user' },
            { cmd: '/warn remove', desc: 'Hapus warn by ID' },
            { cmd: '/warn all', desc: 'Lihat semua warn di server' }
        ]
    },
    {
        category: '🔒 Channel Management',
        color: '#E67E22',
        commands: [
            { cmd: '/lock', desc: 'Lock channel (tidak bisa kirim pesan)' },
            { cmd: '/unlock', desc: 'Unlock channel' },
            { cmd: '/lockview', desc: 'Sembunyikan channel dari semua' },
            { cmd: '/unlockview', desc: 'Tampilkan channel kembali' },
            { cmd: '/slowmode', desc: 'Set slowmode channel (detik)' },
            { cmd: '/clear', desc: 'Hapus pesan (max 100)' }
        ]
    },
    {
        category: '🎭 Role Management',
        color: '#9B59B6',
        commands: [
            { cmd: '/role create', desc: 'Buat role baru (nama, warna, hoist, mentionable)' },
            { cmd: '/role delete', desc: 'Hapus role' },
            { cmd: '/role rename', desc: 'Rename role' },
            { cmd: '/role color', desc: 'Ubah warna role' },
            { cmd: '/role give', desc: 'Beri role ke member' },
            { cmd: '/role remove', desc: 'Hapus role dari member' },
            { cmd: '/role list', desc: 'List semua role di server' },
            { cmd: '/role info', desc: 'Info detail role' }
        ]
    },
    {
        category: '👋 Welcome & Autorole',
        color: '#F1C40F',
        commands: [
            { cmd: '/welcome set-channel', desc: 'Set channel welcome' },
            { cmd: '/welcome set-message', desc: 'Set pesan welcome ({user}, {server}, {membercount})' },
            { cmd: '/welcome set-color', desc: 'Set warna embed welcome' },
            { cmd: '/welcome toggle', desc: 'On/off welcome message' },
            { cmd: '/welcome test', desc: 'Test welcome message' },
            { cmd: '/welcome status', desc: 'Lihat config welcome' },
            { cmd: '/autorole set', desc: 'Set role otomatis untuk member baru' },
            { cmd: '/autorole disable', desc: 'Nonaktifkan autorole' },
            { cmd: '/autorole status', desc: 'Lihat config autorole' },
            { cmd: '/autorole apply', desc: 'Beri role ke SEMUA member' },
            { cmd: '/autorole remove', desc: 'Hapus config autorole' }
        ]
    },
    {
        category: '🏷️ Tag & Reaction Role',
        color: '#3498DB',
        commands: [
            { cmd: '/tag create', desc: 'Buat tag baru' },
            { cmd: '/tag delete', desc: 'Hapus tag' },
            { cmd: '/tag list', desc: 'List semua tag' },
            { cmd: '/tag show', desc: 'Tampilkan tag' },
            { cmd: '!tagname', desc: 'Trigger tag lewat chat (contoh: !rules)' },
            { cmd: '/reactionrole add', desc: 'Tambah reaction role ke pesan' },
            { cmd: '/reactionrole remove', desc: 'Hapus reaction role' },
            { cmd: '/reactionrole list', desc: 'List semua reaction role' }
        ]
    },
    {
        category: '📜 Logging, Starboard & Automod',
        color: '#1ABC9C',
        commands: [
            { cmd: '/logging set', desc: 'Set channel log' },
            { cmd: '/logging toggle', desc: 'On/off logging' },
            { cmd: '/logging events', desc: 'Pilih event yang di-log (messages, members, mod)' },
            { cmd: '/logging status', desc: 'Lihat config logging' },
            { cmd: '/starboard set', desc: 'Setup starboard (channel, emoji, threshold)' },
            { cmd: '/starboard toggle', desc: 'On/off starboard' },
            { cmd: '/starboard status', desc: 'Lihat config starboard' },
            { cmd: '/starboard ignore', desc: 'Ignore channel dari starboard' },
            { cmd: '/automod toggle', desc: 'On/off automod' },
            { cmd: '/automod filters', desc: 'Anti-link, anti-invite, anti-spam, anti-caps' },
            { cmd: '/automod badwords', desc: 'Manage bad words (add/remove/list)' },
            { cmd: '/automod logchannel', desc: 'Set channel log automod' },
            { cmd: '/automod exempt', desc: 'Channel/role yang di-ignore automod' },
            { cmd: '/automod status', desc: 'Lihat config automod' }
        ]
    },
    {
        category: 'ℹ️ Info & Misc',
        color: '#95A5A6',
        commands: [
            { cmd: '/serverinfo', desc: 'Info lengkap server' },
            { cmd: '/userinfo', desc: 'Info user (akun, join, roles)' },
            { cmd: '/ping', desc: 'Cek latency bot' },
            { cmd: '/help', desc: 'Tampilkan bantuan ini' }
        ]
    }
];

// ==========================================
// BARU — BUILD HELP EMBEDS
// ==========================================
function buildHelpEmbeds() {
    const embeds = [];

    for (const group of HELP_DATA) {
        const lines = group.commands.map(c => {
            const desc = c.desc.length > 100 ? c.desc.substring(0, 97) + '...' : c.desc;
            return `**${c.cmd}**\n> ${desc}`;
        });

        // Discord limit: description max 4096 char, jadi pecah kalau perlu
        const chunks = [];
        let current = '';
        for (const line of lines) {
            if ((current + '\n\n' + line).length > 3800) {
                chunks.push(current.trim());
                current = line;
            } else {
                current = current ? current + '\n\n' + line : line;
            }
        }
        if (current) chunks.push(current.trim());

        for (let i = 0; i < chunks.length; i++) {
            const title = chunks.length > 1
                ? `${group.category} (${i + 1}/${chunks.length})`
                : group.category;

            embeds.push(
                new EmbedBuilder()
                    .setColor(group.color)
                    .setTitle(title)
                    .setDescription(chunks[i])
            );
        }
    }

    // Tambah footer di embed terakhir
    if (embeds.length > 0) {
        embeds[embeds.length - 1].setFooter({
            text: 'GrowExs Bot • Ketik /help untuk lihat lagi'
        });
        embeds[embeds.length - 1].setTimestamp();
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

        // ==========================================
        // BARU — /help tampilkan semua command & subcommand
        // ==========================================
        if (cmd === 'help') {
            const embeds = buildHelpEmbeds();

            // Discord max 10 embed per pesan
            // Kalau lebih dari 10, kirim dalam beberapa pesan
            if (embeds.length <= 10) {
                return interaction.reply({ embeds, ephemeral: true });
            }

            // Kirim batch pertama (10 embed)
            await interaction.reply({ embeds: embeds.slice(0, 10), ephemeral: true });

            // Kirim sisanya sebagai followUp
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