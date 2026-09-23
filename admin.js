const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const db = require('./database');

// ==========================================
// 📌 SLASH COMMANDS DEFINITIONS
// ==========================================
const ADMIN_COMMANDS = [
    // ===== CHANNEL LOCK =====
    new SlashCommandBuilder().setName('lock').setDescription('🔒 Lock channel — member tidak bisa kirim pesan')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('unlock').setDescription('🔓 Unlock channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('lockview').setDescription('👁️ Lock view — member tidak bisa lihat channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('unlockview').setDescription('👁️‍🗨️ Unlock view channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('slowmode').setDescription('🐢 Set slowmode channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(opt => opt.setName('seconds').setDescription('Detik (0 = matikan)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .toJSON(),

    new SlashCommandBuilder().setName('clear').setDescription('🗑️ Hapus sejumlah pesan')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt => opt.setName('amount').setDescription('Jumlah (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(opt => opt.setName('user').setDescription('Hanya hapus dari user ini').setRequired(false))
        .toJSON(),

    // ===== ROLE MANAGEMENT =====
    new SlashCommandBuilder().setName('role').setDescription('🎭 Role management')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub => sub.setName('create').setDescription('Buat role baru')
            .addStringOption(opt => opt.setName('name').setDescription('Nama role').setRequired(true).setMaxLength(100))
            .addStringOption(opt => opt.setName('color').setDescription('Warna hex (contoh: #FF0000)').setRequired(false))
            .addBooleanOption(opt => opt.setName('hoist').setDescription('Tampilkan terpisah').setRequired(false))
            .addBooleanOption(opt => opt.setName('mentionable').setDescription('Bisa di-mention').setRequired(false)))
        .addSubcommand(sub => sub.setName('delete').setDescription('Hapus role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(sub => sub.setName('rename').setDescription('Rename role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
            .addStringOption(opt => opt.setName('name').setDescription('Nama baru').setRequired(true).setMaxLength(100)))
        .addSubcommand(sub => sub.setName('color').setDescription('Ubah warna role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
            .addStringOption(opt => opt.setName('color').setDescription('Warna hex').setRequired(true)))
        .addSubcommand(sub => sub.setName('give').setDescription('Beri role ke member')
            .addUserOption(opt => opt.setName('user').setDescription('Member').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Hapus role dari member')
            .addUserOption(opt => opt.setName('user').setDescription('Member').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(sub => sub.setName('list').setDescription('List semua role'))
        .addSubcommand(sub => sub.setName('info').setDescription('Info role')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
        .toJSON(),

    // ===== MODERATION =====
    new SlashCommandBuilder().setName('kick').setDescription('👢 Kick member')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('ban').setDescription('🔨 Ban member')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .addIntegerOption(opt => opt.setName('delete_days').setDescription('Hapus pesan (0-7 hari)').setRequired(false).setMinValue(0).setMaxValue(7))
        .toJSON(),

    new SlashCommandBuilder().setName('unban').setDescription('🔓 Unban user')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(opt => opt.setName('user_id').setDescription('ID user').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('timeout').setDescription('⏱️ Timeout member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Durasi (5m, 1h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('untimeout').setDescription('⏱️ Hapus timeout')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    // ===== WELCOME =====
    new SlashCommandBuilder().setName('welcome').setDescription('👋 Setup welcome message')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName('set-channel').setDescription('Set channel welcome')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sub => sub.setName('set-message').setDescription('Set pesan welcome')
            .addStringOption(opt => opt.setName('message').setDescription('Placeholder: {user}, {username}, {server}, {membercount}').setRequired(true).setMaxLength(1000)))
        .addSubcommand(sub => sub.setName('set-color').setDescription('Set warna embed')
            .addStringOption(opt => opt.setName('color').setDescription('Warna hex (contoh: #57F287)').setRequired(true)))
        .addSubcommand(sub => sub.setName('toggle').setDescription('Aktifkan/nonaktifkan'))
        .addSubcommand(sub => sub.setName('test').setDescription('Test welcome sekarang'))
        .addSubcommand(sub => sub.setName('status').setDescription('Lihat config welcome'))
        .toJSON(),

    // ===== INFO =====
    new SlashCommandBuilder().setName('serverinfo').setDescription('ℹ️ Info server').toJSON(),
    new SlashCommandBuilder().setName('userinfo').setDescription('ℹ️ Info user')
        .addUserOption(opt => opt.setName('user').setDescription('User (default: kamu)').setRequired(false))
        .toJSON()
];

// ==========================================
// 🎨 HELPER
// ==========================================
function parseColor(hex) {
    if (!hex) return null;
    const cleaned = hex.replace('#', '').trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
    return parseInt(cleaned, 16);
}

function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
}

function formatDuration(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
}

function buildWelcomeMessage(template, member, guild) {
    return template
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{tag}/g, member.user.tag)
        .replace(/{server}/g, guild.name)
        .replace(/{membercount}/g, guild.memberCount.toLocaleString())
        .replace(/{id}/g, member.id);
}

// ==========================================
// 🔒 LOCK
// ==========================================
async function handleLock(interaction) {
    const command = interaction.commandName;
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

    const botMember = interaction.guild.members.me;
    const botPerms = targetChannel.permissionsFor(botMember);
    
    if (!botPerms || !botPerms.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: `❌ Bot tidak punya permission **Manage Channels** di ${targetChannel}.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const everyoneRole = interaction.guild.roles.everyone;
    const isThread = targetChannel.isThread();

    try {
        switch (command) {
            case 'lock': {
                if (isThread) {
                    await targetChannel.setLocked(true, `[${interaction.user.username}] ${reason}`);
                } else {
                    await targetChannel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: false, SendMessagesInThreads: false, AddReactions: false,
                        CreatePublicThreads: false, CreatePrivateThreads: false
                    }, { reason: `[${interaction.user.username}] ${reason}` });
                }
                break;
            }
            case 'unlock': {
                if (isThread) {
                    await targetChannel.setLocked(false, `[${interaction.user.username}] ${reason}`);
                } else {
                    await targetChannel.permissionOverwrites.edit(everyoneRole, {
                        SendMessages: null, SendMessagesInThreads: null, AddReactions: null,
                        CreatePublicThreads: null, CreatePrivateThreads: null
                    }, { reason: `[${interaction.user.username}] ${reason}` });
                }
                break;
            }
            case 'lockview': {
                await targetChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false }, { reason: `[${interaction.user.username}] ${reason}` });
                break;
            }
            case 'unlockview': {
                await targetChannel.permissionOverwrites.edit(everyoneRole, { ViewChannel: null }, { reason: `[${interaction.user.username}] ${reason}` });
                break;
            }
        }

        console.log(`🔒 [${command.toUpperCase()}] ${interaction.user.username} → #${targetChannel.name}`);
        const colors = { lock: '#ED4245', unlock: '#57F287', lockview: '#ED4245', unlockview: '#57F287' };
        const titles = { lock: '🔒 Channel Locked', unlock: '🔓 Channel Unlocked', lockview: '👁️ View Locked', unlockview: '👁️‍🗨️ View Unlocked' };

        const embed = new EmbedBuilder().setColor(colors[command]).setTitle(titles[command])
            .addFields(
                { name: '📌 Channel', value: `${targetChannel}`, inline: true },
                { name: '🛡️ Moderator', value: `${interaction.user}`, inline: true },
                { name: '📝 Alasan', value: reason ? `\`${reason}\`` : '*Tidak ada*', inline: false }
            ).setTimestamp();

        if (command === 'lock' || command === 'unlock') {
            try {
                const publicEmbed = new EmbedBuilder().setColor(colors[command])
                    .setDescription(command === 'lock' 
                        ? `🔒 **Channel ini telah di-lock oleh ${interaction.user}**\n> Alasan: \`${reason}\``
                        : `🔓 **Channel ini telah di-unlock oleh ${interaction.user}**`)
                    .setTimestamp();
                await targetChannel.send({ embeds: [publicEmbed] });
            } catch (e) {}
        }

        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        return interaction.editReply({ content: `❌ Gagal: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// 🎭 ROLE
// ==========================================
async function handleRole(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
        switch (sub) {
            case 'create': {
                const name = interaction.options.getString('name');
                const colorHex = interaction.options.getString('color');
                const hoist = interaction.options.getBoolean('hoist') ?? false;
                const mentionable = interaction.options.getBoolean('mentionable') ?? false;
                const color = colorHex ? parseColor(colorHex) : null;
                if (colorHex && color === null) return interaction.editReply({ content: `❌ Format warna salah!` });
                const role = await interaction.guild.roles.create({ name, color: color || undefined, hoist, mentionable, reason: `Dibuat oleh ${interaction.user.username}` });
                console.log(`🎭 Role dibuat: ${name}`);
                return interaction.editReply({ content: `✅ Role ${role} berhasil dibuat!` });
            }
            case 'delete': {
                const role = interaction.options.getRole('role');
                if (role.managed) return interaction.editReply({ content: `❌ Role di-manage bot.` });
                if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });
                const name = role.name;
                await role.delete(`Dihapus oleh ${interaction.user.username}`);
                return interaction.editReply({ content: `✅ Role **${name}** dihapus.` });
            }
            case 'rename': {
                const role = interaction.options.getRole('role');
                const newName = interaction.options.getString('name');
                const oldName = role.name;
                await role.setName(newName, `Rename oleh ${interaction.user.username}`);
                return interaction.editReply({ content: `✅ **${oldName}** → **${newName}**` });
            }
            case 'color': {
                const role = interaction.options.getRole('role');
                const color = parseColor(interaction.options.getString('color'));
                if (color === null) return interaction.editReply({ content: `❌ Format warna salah!` });
                await role.setColor(color, `Ubah warna`);
                return interaction.editReply({ content: `✅ Warna **${role.name}** diubah.` });
            }
            case 'give': {
                const user = interaction.options.getUser('user');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) return interaction.editReply({ content: `❌ Member tidak ditemukan.` });
                if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });
                await member.roles.add(role, `Diberikan oleh ${interaction.user.username}`);
                return interaction.editReply({ content: `✅ ${role} → ${member}` });
            }
            case 'remove': {
                const user = interaction.options.getUser('user');
                const role = interaction.options.getRole('role');
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) return interaction.editReply({ content: `❌ Member tidak ditemukan.` });
                if (!member.roles.cache.has(role.id)) return interaction.editReply({ content: `❌ Member tidak punya role ini.` });
                await member.roles.remove(role, `Dihapus oleh ${interaction.user.username}`);
                return interaction.editReply({ content: `✅ ${role} dihapus dari ${member}` });
            }
            case 'list': {
                const roles = interaction.guild.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
                const lines = roles.map(r => `${r} — \`${r.members.size}\``).slice(0, 30);
                const embed = new EmbedBuilder().setColor('#5865F2')
                    .setTitle(`🎭 Roles di ${interaction.guild.name} (${roles.size})`)
                    .setDescription(lines.join('\n') || '*Tidak ada role*');
                return interaction.editReply({ embeds: [embed] });
            }
            case 'info': {
                const role = interaction.options.getRole('role');
                const embed = new EmbedBuilder().setColor(role.color || '#5865F2').setTitle(`🎭 ${role.name}`)
                    .addFields(
                        { name: 'ID', value: `\`${role.id}\``, inline: true },
                        { name: 'Warna', value: `\`${role.hexColor}\``, inline: true },
                        { name: 'Position', value: `${role.position}`, inline: true },
                        { name: 'Member', value: `${role.members.size}`, inline: true },
                        { name: 'Hoisted', value: role.hoist ? '✅' : '❌', inline: true },
                        { name: 'Mentionable', value: role.mentionable ? '✅' : '❌', inline: true }
                    );
                return interaction.editReply({ embeds: [embed] });
            }
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Gagal: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// 🔨 MODERATION
// ==========================================
async function handleModeration(interaction) {
    const command = interaction.commandName;
    await interaction.deferReply({ ephemeral: true });

    try {
        switch (command) {
            case 'kick': {
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) return interaction.editReply({ content: `❌ Member tidak di server.` });
                if (!member.kickable) return interaction.editReply({ content: `❌ Tidak bisa kick.` });
                await member.kick(`[${interaction.user.username}] ${reason}`);
                return interaction.editReply({ content: `👢 **${user.tag}** di-kick.\n> ${reason}` });
            }
            case 'ban': {
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
                const deleteDays = interaction.options.getInteger('delete_days') || 0;
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (member && !member.bannable) return interaction.editReply({ content: `❌ Tidak bisa ban.` });
                await interaction.guild.members.ban(user.id, { reason: `[${interaction.user.username}] ${reason}`, deleteMessageSeconds: deleteDays * 86400 });
                return interaction.editReply({ content: `🔨 **${user.tag}** di-ban.\n> ${reason}` });
            }
            case 'unban': {
                const userId = interaction.options.getString('user_id');
                const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
                try {
                    const user = await interaction.client.users.fetch(userId);
                    await interaction.guild.members.unban(userId, `[${interaction.user.username}] ${reason}`);
                    return interaction.editReply({ content: `🔓 **${user.tag}** di-unban.` });
                } catch (e) { return interaction.editReply({ content: `❌ Gagal: \`${e.message}\`` }); }
            }
            case 'timeout': {
                const user = interaction.options.getUser('user');
                const durationStr = interaction.options.getString('duration');
                const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
                const durationMs = parseDuration(durationStr);
                if (!durationMs) return interaction.editReply({ content: `❌ Format durasi salah! Contoh: \`5m\`, \`1h\`` });
                if (durationMs > 28 * 86400000) return interaction.editReply({ content: `❌ Max 28 hari.` });
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) return interaction.editReply({ content: `❌ Member tidak di server.` });
                if (!member.moderatable) return interaction.editReply({ content: `❌ Tidak bisa timeout.` });
                await member.timeout(durationMs, `[${interaction.user.username}] ${reason}`);
                return interaction.editReply({ content: `⏱️ **${user.tag}** di-timeout **${formatDuration(durationMs)}**.\n> ${reason}` });
            }
            case 'untimeout': {
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
                const member = await interaction.guild.members.fetch(user.id).catch(() => null);
                if (!member) return interaction.editReply({ content: `❌ Member tidak di server.` });
                await member.timeout(null, `[${interaction.user.username}] ${reason}`);
                return interaction.editReply({ content: `⏱️ Timeout **${user.tag}** dihapus.` });
            }
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Gagal: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// 🐢 SLOWMODE + 🗑️ CLEAR
// ==========================================
async function handleChannelUtil(interaction) {
    const command = interaction.commandName;
    await interaction.deferReply({ ephemeral: true });

    try {
        if (command === 'slowmode') {
            const seconds = interaction.options.getInteger('seconds');
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            if (!channel.isTextBased()) return interaction.editReply({ content: `❌ Bukan text channel.` });
            await channel.setRateLimitPerUser(seconds, `Diatur oleh ${interaction.user.username}`);
            return interaction.editReply({ content: seconds === 0 ? `🐢 Slowmode dimatikan.` : `🐢 Slowmode ${seconds}s.` });
        }
        if (command === 'clear') {
            const amount = interaction.options.getInteger('amount');
            const user = interaction.options.getUser('user');
            let messages = await interaction.channel.messages.fetch({ limit: amount });
            if (user) messages = messages.filter(m => m.author.id === user.id);
            const deleted = await interaction.channel.bulkDelete(messages, true);
            return interaction.editReply({ content: `🗑️ **${deleted.size}** pesan dihapus.` });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Gagal: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// 👋 WELCOME
// ==========================================
async function handleWelcome(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    await interaction.deferReply({ ephemeral: true });

    try {
        let config = db.getWelcomeConfig(guildId) || { 
            guildId, channelId: null, 
            message: 'Welcome {user} to **{server}**! 🎉\nYou are member **#{membercount}**.', 
            enabled: 0, embedColor: '#57F287' 
        };

        switch (sub) {
            case 'set-channel': {
                const channel = interaction.options.getChannel('channel');
                config.channelId = channel.id;
                db.setWelcomeConfig(guildId, config);
                return interaction.editReply({ content: `✅ Welcome channel → ${channel}` });
            }
            case 'set-message': {
                config.message = interaction.options.getString('message');
                db.setWelcomeConfig(guildId, config);
                return interaction.editReply({ content: `✅ Pesan welcome diset!\n> Placeholder: \`{user}\` \`{username}\` \`{server}\` \`{membercount}\`` });
            }
            case 'set-color': {
                const colorHex = interaction.options.getString('color');
                if (parseColor(colorHex) === null) return interaction.editReply({ content: `❌ Format warna salah!` });
                config.embedColor = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
                db.setWelcomeConfig(guildId, config);
                return interaction.editReply({ content: `✅ Warna → \`${config.embedColor}\`` });
            }
            case 'toggle': {
                config.enabled = config.enabled ? 0 : 1;
                db.setWelcomeConfig(guildId, config);
                return interaction.editReply({ content: config.enabled ? '✅ Welcome **AKTIF**.' : '❌ Welcome **NONAKTIF**.' });
            }
            case 'test': {
                if (!config.channelId) return interaction.editReply({ content: `❌ Set channel dulu.` });
                const channel = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
                if (!channel) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });
                const text = buildWelcomeMessage(config.message, interaction.member, interaction.guild);
                const embed = new EmbedBuilder().setColor(parseColor(config.embedColor) || '#57F287').setTitle('👋 Welcome!')
                    .setDescription(text).setThumbnail(interaction.user.displayAvatarURL()).setTimestamp();
                await channel.send({ embeds: [embed] });
                return interaction.editReply({ content: `✅ Test terkirim.` });
            }
            case 'status': {
                const embed = new EmbedBuilder().setColor(config.enabled ? '#57F287' : '#ED4245')
                    .setTitle('👋 Welcome Config')
                    .addFields(
                        { name: 'Status', value: config.enabled ? '✅ Aktif' : '❌ Nonaktif', inline: true },
                        { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : '*Belum diset*', inline: true },
                        { name: 'Warna', value: `\`${config.embedColor}\``, inline: true },
                        { name: 'Pesan', value: `\`\`\`${config.message}\`\`\``, inline: false }
                    );
                return interaction.editReply({ embeds: [embed] });
            }
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Gagal: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// ℹ️ INFO
// ==========================================
async function handleInfo(interaction) {
    await interaction.deferReply();

    try {
        if (interaction.commandName === 'serverinfo') {
            const guild = interaction.guild;
            const embed = new EmbedBuilder().setColor('#5865F2').setTitle(`ℹ️ ${guild.name}`)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .addFields(
                    { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                    { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
                    { name: '📅 Dibuat', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👥 Member', value: `${guild.memberCount}`, inline: true },
                    { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: '📢 Channels', value: `${guild.channels.cache.size}`, inline: true },
                    { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                    { name: '🚀 Boost', value: `Level ${guild.premiumTier}`, inline: true }
                );
            return interaction.editReply({ embeds: [embed] });
        }
        if (interaction.commandName === 'userinfo') {
            const user = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const embed = new EmbedBuilder().setColor(member?.displayHexColor || '#5865F2').setTitle(`ℹ️ ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                    { name: '🤖 Bot', value: user.bot ? '✅' : '❌', inline: true },
                    { name: '📅 Akun dibuat', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
                );
            if (member) {
                const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position).map(r => r.toString()).slice(0, 10).join(', ') || '*Tidak ada*';
                embed.addFields(
                    { name: '📅 Join', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '*Unknown*', inline: true },
                    { name: '🎨 Nickname', value: member.nickname || '*Tidak ada*', inline: true },
                    { name: '🎭 Roles', value: roles, inline: false }
                );
            }
            return interaction.editReply({ embeds: [embed] });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Gagal: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// 🎯 MAIN HANDLER
// ==========================================
async function handleAdminInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return false;
    const cmd = interaction.commandName;
    const lockCmds = ['lock', 'unlock', 'lockview', 'unlockview'];
    const modCmds = ['kick', 'ban', 'unban', 'timeout', 'untimeout'];
    const utilCmds = ['slowmode', 'clear'];
    const infoCmds = ['serverinfo', 'userinfo'];

    try {
        if (lockCmds.includes(cmd)) { await handleLock(interaction); return true; }
        if (cmd === 'role') { await handleRole(interaction); return true; }
        if (modCmds.includes(cmd)) { await handleModeration(interaction); return true; }
        if (utilCmds.includes(cmd)) { await handleChannelUtil(interaction); return true; }
        if (cmd === 'welcome') { await handleWelcome(interaction); return true; }
        if (infoCmds.includes(cmd)) { await handleInfo(interaction); return true; }
    } catch (err) {
        console.error(`❌ [admin ${cmd}] Error:`, err);
        try {
            const content = `❌ Error: \`${err.message}\``;
            if (interaction.deferred) await interaction.editReply({ content });
            else await interaction.reply({ content, ephemeral: true });
        } catch {}
        return true;
    }
    return false;
}

// ==========================================
// 👋 MEMBER JOIN
// ==========================================
async function handleMemberJoin(member) {
    try {
        const config = db.getWelcomeConfig(member.guild.id);
        if (!config || !config.enabled || !config.channelId) return;
        const channel = await member.guild.channels.fetch(config.channelId).catch(() => null);
        if (!channel) return;
        const text = buildWelcomeMessage(config.message, member, member.guild);
        const embed = new EmbedBuilder().setColor(parseColor(config.embedColor) || '#57F287').setTitle('👋 Welcome!')
            .setDescription(text).setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `Member #${member.guild.memberCount}` }).setTimestamp();
        await channel.send({ embeds: [embed] });
        console.log(`👋 Welcome: ${member.user.username} → ${member.guild.name}`);
    } catch (err) { console.error('❌ Welcome error:', err.message); }
}

module.exports = {
    ADMIN_COMMANDS,
    handleAdminInteraction,
    handleMemberJoin
};