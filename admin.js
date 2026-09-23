const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const ADMIN_COMMANDS = [
    // ===== LOCK =====
    new SlashCommandBuilder().setName('lock').setDescription('🔒 Lock channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('unlock').setDescription('🔓 Unlock channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('lockview').setDescription('👁️ Lock view channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .toJSON(),

    new SlashCommandBuilder().setName('unlockview').setDescription('👁️‍🗨️ Unlock view channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .toJSON(),

    new SlashCommandBuilder().setName('slowmode').setDescription('🐢 Set slowmode')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(o => o.setName('seconds').setDescription('Detik (0=off)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .addChannelOption(o => o.setName('channel').setDescription('Channel (default: ini)').setRequired(false))
        .toJSON(),

    new SlashCommandBuilder().setName('clear').setDescription('🗑️ Hapus pesan')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o.setName('amount').setDescription('Jumlah (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('user').setDescription('Hanya dari user ini').setRequired(false))
        .toJSON(),

    // ===== ROLE =====
    new SlashCommandBuilder().setName('role').setDescription('🎭 Role management')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s => s.setName('create').setDescription('Buat role')
            .addStringOption(o => o.setName('name').setDescription('Nama').setRequired(true).setMaxLength(100))
            .addStringOption(o => o.setName('color').setDescription('Hex (#FF0000)').setRequired(false))
            .addBooleanOption(o => o.setName('hoist').setDescription('Tampil terpisah').setRequired(false))
            .addBooleanOption(o => o.setName('mentionable').setDescription('Bisa di-mention').setRequired(false)))
        .addSubcommand(s => s.setName('delete').setDescription('Hapus role')
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(s => s.setName('rename').setDescription('Rename role')
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
            .addStringOption(o => o.setName('name').setDescription('Nama baru').setRequired(true).setMaxLength(100)))
        .addSubcommand(s => s.setName('color').setDescription('Ubah warna')
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
            .addStringOption(o => o.setName('color').setDescription('Hex').setRequired(true)))
        .addSubcommand(s => s.setName('give').setDescription('Beri role')
            .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Hapus role dari member')
            .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List role'))
        .addSubcommand(s => s.setName('info').setDescription('Info role')
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
        .toJSON(),

    // ===== MODERATION =====
    new SlashCommandBuilder().setName('kick').setDescription('👢 Kick member')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('ban').setDescription('🔨 Ban member')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .addIntegerOption(o => o.setName('delete_days').setDescription('Hapus pesan (0-7 hari)').setRequired(false).setMinValue(0).setMaxValue(7))
        .toJSON(),

    new SlashCommandBuilder().setName('unban').setDescription('🔓 Unban user')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(o => o.setName('user_id').setDescription('ID user').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('timeout').setDescription('⏱️ Timeout member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .addStringOption(o => o.setName('duration').setDescription('Durasi (5m, 1h, 1d)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Alasan').setRequired(false).setMaxLength(200))
        .toJSON(),

    new SlashCommandBuilder().setName('untimeout').setDescription('⏱️ Hapus timeout')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
        .toJSON(),

    // ===== WELCOME =====
    new SlashCommandBuilder().setName('welcome').setDescription('👋 Welcome setup')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('set-channel').setDescription('Set channel welcome')
            .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(s => s.setName('set-message').setDescription('Set pesan welcome')
            .addStringOption(o => o.setName('message').setDescription('Placeholder: {user}, {server}, {membercount}').setRequired(true).setMaxLength(1000)))
        .addSubcommand(s => s.setName('set-color').setDescription('Set warna embed')
            .addStringOption(o => o.setName('color').setDescription('Hex (#57F287)').setRequired(true)))
        .addSubcommand(s => s.setName('toggle').setDescription('On/off'))
        .addSubcommand(s => s.setName('test').setDescription('Test'))
        .addSubcommand(s => s.setName('status').setDescription('Status'))
        .toJSON(),

    // ===== AUTOROLE =====
    new SlashCommandBuilder().setName('autorole').setDescription('🎁 Autorole — role otomatis untuk member baru')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(s => s.setName('set').setDescription('Set role otomatis')
            .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(s => s.setName('disable').setDescription('Nonaktifkan autorole'))
        .addSubcommand(s => s.setName('status').setDescription('Lihat config'))
        .addSubcommand(s => s.setName('apply').setDescription('Berikan role ke SEMUA member'))
        .addSubcommand(s => s.setName('remove').setDescription('Hapus config autorole'))
        .toJSON(),

    // ===== INFO =====
    new SlashCommandBuilder().setName('serverinfo').setDescription('ℹ️ Info server').toJSON(),
    new SlashCommandBuilder().setName('userinfo').setDescription('ℹ️ Info user')
        .addUserOption(o => o.setName('user').setDescription('User (default: kamu)').setRequired(false))
        .toJSON()
];

// ==========================================
// HELPER
// ==========================================
function parseColor(hex) {
    if (!hex) return null;
    const cleaned = hex.replace('#', '').trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
    return parseInt(cleaned, 16);
}

function parseDuration(str) {
    const m = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!m) return null;
    const v = parseInt(m[1]);
    const u = m[2].toLowerCase();
    return v * { s: 1000, m: 60000, h: 3600000, d: 86400000 }[u];
}

function formatDuration(ms) {
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const p = [];
    if (d) p.push(`${d}d`);
    if (h) p.push(`${h}h`);
    if (m) p.push(`${m}m`);
    if (s) p.push(`${s}s`);
    return p.join(' ') || '0s';
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
// LOCK
// ==========================================
async function handleLock(interaction) {
    const cmd = interaction.commandName;
    const ch = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

    if (!ch.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: `❌ Bot tidak punya permission Manage Channels di ${ch}.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const everyone = interaction.guild.roles.everyone;
    const isThread = ch.isThread();

    try {
        if (cmd === 'lock') {
            if (isThread) await ch.setLocked(true, `[${interaction.user.username}] ${reason}`);
            else await ch.permissionOverwrites.edit(everyone, {
                SendMessages: false, SendMessagesInThreads: false, AddReactions: false,
                CreatePublicThreads: false, CreatePrivateThreads: false
            }, { reason: `[${interaction.user.username}] ${reason}` });
        } else if (cmd === 'unlock') {
            if (isThread) await ch.setLocked(false, `[${interaction.user.username}] ${reason}`);
            else await ch.permissionOverwrites.edit(everyone, {
                SendMessages: null, SendMessagesInThreads: null, AddReactions: null,
                CreatePublicThreads: null, CreatePrivateThreads: null
            }, { reason: `[${interaction.user.username}] ${reason}` });
        } else if (cmd === 'lockview') {
            await ch.permissionOverwrites.edit(everyone, { ViewChannel: false }, { reason: `[${interaction.user.username}]` });
        } else if (cmd === 'unlockview') {
            await ch.permissionOverwrites.edit(everyone, { ViewChannel: null }, { reason: `[${interaction.user.username}]` });
        }

        console.log(`🔒 ${cmd} → #${ch.name} oleh ${interaction.user.username}`);
        const colors = { lock: '#ED4245', unlock: '#57F287', lockview: '#ED4245', unlockview: '#57F287' };
        const titles = { lock: '🔒 Locked', unlock: '🔓 Unlocked', lockview: '👁️ View Locked', unlockview: '👁️‍🗨️ View Unlocked' };

        const embed = new EmbedBuilder().setColor(colors[cmd]).setTitle(titles[cmd])
            .addFields(
                { name: 'Channel', value: `${ch}`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Alasan', value: reason, inline: false }
            ).setTimestamp();

        if (cmd === 'lock' || cmd === 'unlock') {
            try {
                await ch.send({ embeds: [new EmbedBuilder().setColor(colors[cmd])
                    .setDescription(cmd === 'lock' ? `🔒 Di-lock oleh ${interaction.user}` : `🔓 Di-unlock oleh ${interaction.user}`)] });
            } catch {}
        }

        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
}

// ==========================================
// ROLE
// ==========================================
async function handleRole(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
        if (sub === 'create') {
            const name = interaction.options.getString('name');
            const colorHex = interaction.options.getString('color');
            const color = colorHex ? parseColor(colorHex) : null;
            if (colorHex && color === null) return interaction.editReply({ content: `❌ Format warna salah!` });
            const role = await interaction.guild.roles.create({
                name,
                color: color || undefined,
                hoist: interaction.options.getBoolean('hoist') ?? false,
                mentionable: interaction.options.getBoolean('mentionable') ?? false,
                reason: `Dibuat oleh ${interaction.user.username}`
            });
            return interaction.editReply({ content: `✅ Role ${role} dibuat!` });
        }
        if (sub === 'delete') {
            const role = interaction.options.getRole('role');
            if (role.managed) return interaction.editReply({ content: `❌ Role di-manage bot.` });
            if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });
            const name = role.name;
            await role.delete(`Dihapus oleh ${interaction.user.username}`);
            return interaction.editReply({ content: `✅ **${name}** dihapus.` });
        }
        if (sub === 'rename') {
            const role = interaction.options.getRole('role');
            const old = role.name;
            await role.setName(interaction.options.getString('name'));
            return interaction.editReply({ content: `✅ **${old}** → **${role.name}**` });
        }
        if (sub === 'color') {
            const role = interaction.options.getRole('role');
            const color = parseColor(interaction.options.getString('color'));
            if (color === null) return interaction.editReply({ content: `❌ Format warna salah!` });
            await role.setColor(color);
            return interaction.editReply({ content: `✅ Warna **${role.name}** diubah.` });
        }
        if (sub === 'give') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.editReply({ content: `❌ Member tidak ditemukan.` });
            if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });
            await member.roles.add(role);
            return interaction.editReply({ content: `✅ ${role} → ${member}` });
        }
        if (sub === 'remove') {
            const user = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.editReply({ content: `❌ Member tidak ditemukan.` });
            if (!member.roles.cache.has(role.id)) return interaction.editReply({ content: `❌ Member tidak punya role ini.` });
            await member.roles.remove(role);
            return interaction.editReply({ content: `✅ ${role} dihapus dari ${member}` });
        }
        if (sub === 'list') {
            const roles = interaction.guild.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position);
            const lines = roles.map(r => `${r} — \`${r.members.size}\``).slice(0, 30);
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#5865F2')
                .setTitle(`🎭 Roles (${roles.size})`)
                .setDescription(lines.join('\n') || '*Tidak ada*')] });
        }
        if (sub === 'info') {
            const r = interaction.options.getRole('role');
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor(r.color || '#5865F2')
                .setTitle(`🎭 ${r.name}`)
                .addFields(
                    { name: 'ID', value: `\`${r.id}\``, inline: true },
                    { name: 'Warna', value: `\`${r.hexColor}\``, inline: true },
                    { name: 'Position', value: `${r.position}`, inline: true },
                    { name: 'Member', value: `${r.members.size}`, inline: true },
                    { name: 'Hoisted', value: r.hoist ? '✅' : '❌', inline: true },
                    { name: 'Mentionable', value: r.mentionable ? '✅' : '❌', inline: true }
                )] });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
}

// ==========================================
// MODERATION
// ==========================================
async function handleMod(interaction) {
    const cmd = interaction.commandName;
    await interaction.deferReply({ ephemeral: true });

    try {
        if (cmd === 'kick') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.editReply({ content: `❌ Member tidak di server.` });
            if (!member.kickable) return interaction.editReply({ content: `❌ Tidak bisa kick.` });
            await member.kick(`[${interaction.user.username}] ${reason}`);
            return interaction.editReply({ content: `👢 **${user.tag}** di-kick.\n> ${reason}` });
        }
        if (cmd === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
            const deleteDays = interaction.options.getInteger('delete_days') || 0;
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (member && !member.bannable) return interaction.editReply({ content: `❌ Tidak bisa ban.` });
            await interaction.guild.members.ban(user.id, { reason: `[${interaction.user.username}] ${reason}`, deleteMessageSeconds: deleteDays * 86400 });
            return interaction.editReply({ content: `🔨 **${user.tag}** di-ban.\n> ${reason}` });
        }
        if (cmd === 'unban') {
            const userId = interaction.options.getString('user_id');
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
            try {
                const user = await interaction.client.users.fetch(userId);
                await interaction.guild.members.unban(userId, `[${interaction.user.username}] ${reason}`);
                return interaction.editReply({ content: `🔓 **${user.tag}** di-unban.` });
            } catch (e) { return interaction.editReply({ content: `❌ Error: \`${e.message}\`` }); }
        }
        if (cmd === 'timeout') {
            const user = interaction.options.getUser('user');
            const durStr = interaction.options.getString('duration');
            const reason = interaction.options.getString('reason') || 'Tidak ada alasan';
            const ms = parseDuration(durStr);
            if (!ms) return interaction.editReply({ content: `❌ Format durasi salah! Contoh: \`5m\`, \`1h\`` });
            if (ms > 28 * 86400000) return interaction.editReply({ content: `❌ Max 28 hari.` });
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.editReply({ content: `❌ Member tidak di server.` });
            if (!member.moderatable) return interaction.editReply({ content: `❌ Tidak bisa timeout.` });
            await member.timeout(ms, `[${interaction.user.username}] ${reason}`);
            return interaction.editReply({ content: `⏱️ **${user.tag}** timeout **${formatDuration(ms)}**.\n> ${reason}` });
        }
        if (cmd === 'untimeout') {
            const user = interaction.options.getUser('user');
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.editReply({ content: `❌ Member tidak di server.` });
            await member.timeout(null);
            return interaction.editReply({ content: `⏱️ Timeout **${user.tag}** dihapus.` });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
}

// ==========================================
// SLOWMODE + CLEAR
// ==========================================
async function handleUtil(interaction) {
    const cmd = interaction.commandName;
    await interaction.deferReply({ ephemeral: true });

    try {
        if (cmd === 'slowmode') {
            const sec = interaction.options.getInteger('seconds');
            const ch = interaction.options.getChannel('channel') || interaction.channel;
            if (!ch.isTextBased()) return interaction.editReply({ content: `❌ Bukan text channel.` });
            await ch.setRateLimitPerUser(sec);
            return interaction.editReply({ content: sec === 0 ? `🐢 Slowmode off.` : `🐢 Slowmode ${sec}s.` });
        }
        if (cmd === 'clear') {
            const amount = interaction.options.getInteger('amount');
            const user = interaction.options.getUser('user');
            let msgs = await interaction.channel.messages.fetch({ limit: amount });
            if (user) msgs = msgs.filter(m => m.author.id === user.id);
            const deleted = await interaction.channel.bulkDelete(msgs, true);
            return interaction.editReply({ content: `🗑️ **${deleted.size}** pesan dihapus.` });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
}

// ==========================================
// WELCOME
// ==========================================
async function handleWelcome(interaction) {
    const db = require('./database');
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    await interaction.deferReply({ ephemeral: true });

    try {
        let config = db.getWelcomeConfig(guildId) || { 
            guildId, channelId: null, 
            message: 'Welcome {user} ke **{server}**! 🎉\nMember ke-**{membercount}**', 
            enabled: 0, embedColor: '#57F287' 
        };

        if (sub === 'set-channel') {
            config.channelId = interaction.options.getChannel('channel').id;
            db.setWelcomeConfig(guildId, config);
            return interaction.editReply({ content: `✅ Welcome channel diset.` });
        }
        if (sub === 'set-message') {
            config.message = interaction.options.getString('message');
            db.setWelcomeConfig(guildId, config);
            return interaction.editReply({ content: `✅ Pesan diset!\n> Placeholder: \`{user}\` \`{username}\` \`{server}\` \`{membercount}\`` });
        }
        if (sub === 'set-color') {
            const colorHex = interaction.options.getString('color');
            if (parseColor(colorHex) === null) return interaction.editReply({ content: `❌ Format warna salah!` });
            config.embedColor = colorHex.startsWith('#') ? colorHex : `#${colorHex}`;
            db.setWelcomeConfig(guildId, config);
            return interaction.editReply({ content: `✅ Warna → \`${config.embedColor}\`` });
        }
        if (sub === 'toggle') {
            config.enabled = config.enabled ? 0 : 1;
            db.setWelcomeConfig(guildId, config);
            return interaction.editReply({ content: config.enabled ? '✅ Welcome **ON**' : '❌ Welcome **OFF**' });
        }
        if (sub === 'test') {
            if (!config.channelId) return interaction.editReply({ content: `❌ Set channel dulu.` });
            const ch = await interaction.guild.channels.fetch(config.channelId).catch(() => null);
            if (!ch) return interaction.editReply({ content: `❌ Channel tidak ditemukan.` });
            const text = buildWelcomeMessage(config.message, interaction.member, interaction.guild);
            await ch.send({ embeds: [new EmbedBuilder()
                .setColor(parseColor(config.embedColor) || '#57F287')
                .setTitle('👋 Welcome!')
                .setDescription(text)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp()] });
            return interaction.editReply({ content: `✅ Test terkirim.` });
        }
        if (sub === 'status') {
            return interaction.editReply({ embeds: [new EmbedBuilder()
                .setColor(config.enabled ? '#57F287' : '#ED4245')
                .setTitle('👋 Welcome Config')
                .addFields(
                    { name: 'Status', value: config.enabled ? '✅ Aktif' : '❌ Nonaktif', inline: true },
                    { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : '*Belum*', inline: true },
                    { name: 'Warna', value: `\`${config.embedColor}\``, inline: true },
                    { name: 'Pesan', value: `\`\`\`${config.message}\`\`\``, inline: false }
                )] });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
}

// ==========================================
// AUTOROLE
// ==========================================
async function handleAutoRole(interaction) {
    const db = require('./database');
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    await interaction.deferReply({ ephemeral: true });

    try {
        if (sub === 'set') {
            const role = interaction.options.getRole('role');
            if (role.managed) return interaction.editReply({ content: `❌ Role di-manage bot.` });
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });
            }
            db.setAutoRoleConfig(guildId, role.id, true);
            console.log(`🎁 Autorole set: ${role.name}`);
            return interaction.editReply({ 
                content: `✅ **Autorole aktif!**\n> Role: ${role}\n> Member baru akan otomatis dapat role ini.\n\n💡 \`/autorole apply\` untuk beri ke semua member.` 
            });
        }
        if (sub === 'disable') {
            const c = db.getAutoRoleConfig(guildId);
            if (!c || !c.roleId) return interaction.editReply({ content: `❌ Autorole belum diset.` });
            db.setAutoRoleConfig(guildId, c.roleId, false);
            return interaction.editReply({ content: `❌ Autorole dinonaktifkan.` });
        }
        if (sub === 'remove') {
            db.removeAutoRoleConfig(guildId);
            return interaction.editReply({ content: `🗑️ Config autorole dihapus.` });
        }
        if (sub === 'status') {
            const c = db.getAutoRoleConfig(guildId);
            if (!c || !c.roleId) return interaction.editReply({ content: `❌ Autorole belum diset.` });
            const role = interaction.guild.roles.cache.get(c.roleId);
            return interaction.editReply({ embeds: [new EmbedBuilder()
                .setColor(c.enabled ? '#57F287' : '#ED4245')
                .setTitle('🎁 Autorole Config')
                .addFields(
                    { name: 'Status', value: c.enabled ? '✅ Aktif' : '❌ Nonaktif', inline: true },
                    { name: 'Role', value: role ? `${role}` : `*Tidak ditemukan*`, inline: true }
                )] });
        }
        if (sub === 'apply') {
            const c = db.getAutoRoleConfig(guildId);
            if (!c || !c.roleId) return interaction.editReply({ content: `❌ Set autorole dulu.` });
            const role = interaction.guild.roles.cache.get(c.roleId);
            if (!role) return interaction.editReply({ content: `❌ Role tidak ditemukan.` });
            if (role.position >= interaction.guild.members.me.roles.highest.position) return interaction.editReply({ content: `❌ Role lebih tinggi dari bot!` });

            await interaction.editReply({ content: `⏳ Fetch semua member...` });
            const members = await interaction.guild.members.fetch().catch(() => null);
            if (!members) return interaction.editReply({ content: `❌ Gagal fetch member.` });

            const target = members.filter(m => !m.roles.cache.has(role.id) && !m.user.bot);
            const total = target.size;
            if (total === 0) return interaction.editReply({ content: `✅ Semua member sudah punya ${role}.` });

            let success = 0, failed = 0, processed = 0;
            const start = Date.now();

            for (const [, member] of target) {
                try { await member.roles.add(role, 'Autorole apply'); success++; }
                catch { failed++; }
                processed++;
                if (processed % 50 === 0) {
                    try { await interaction.editReply({ content: `⏳ ${processed}/${total}... ✅ ${success} | ❌ ${failed}` }); } catch {}
                }
                if (processed % 10 === 0) await new Promise(r => setTimeout(r, 1000));
            }
            const dur = ((Date.now() - start) / 1000).toFixed(1);
            return interaction.editReply({ 
                content: `✅ **Autorole apply selesai!**\n\n> Role: ${role}\n> ✅ Berhasil: **${success}**\n> ❌ Gagal: **${failed}**\n> ⏱️ ${dur}s` 
            });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` }).catch(() => {});
    }
}

// ==========================================
// INFO
// ==========================================
async function handleInfo(interaction) {
    await interaction.deferReply();
    try {
        if (interaction.commandName === 'serverinfo') {
            const g = interaction.guild;
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#5865F2')
                .setTitle(`ℹ️ ${g.name}`)
                .setThumbnail(g.iconURL({ size: 256 }))
                .addFields(
                    { name: '👑 Owner', value: `<@${g.ownerId}>`, inline: true },
                    { name: '🆔 ID', value: `\`${g.id}\``, inline: true },
                    { name: '📅 Dibuat', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '👥 Member', value: `${g.memberCount}`, inline: true },
                    { name: '🎭 Roles', value: `${g.roles.cache.size}`, inline: true },
                    { name: '📢 Channels', value: `${g.channels.cache.size}`, inline: true }
                )] });
        }
        if (interaction.commandName === 'userinfo') {
            const user = interaction.options.getUser('user') || interaction.user;
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const embed = new EmbedBuilder().setColor(member?.displayHexColor || '#5865F2')
                .setTitle(`ℹ️ ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ size: 256 }))
                .addFields(
                    { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                    { name: '🤖 Bot', value: user.bot ? '✅' : '❌', inline: true },
                    { name: '📅 Akun', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
                );
            if (member) {
                const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id).sort((a, b) => b.position - a.position).map(r => r.toString()).slice(0, 10).join(', ') || '*Tidak ada*';
                embed.addFields(
                    { name: '📅 Join', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '*Unknown*', inline: true },
                    { name: '🎨 Nick', value: member.nickname || '*Tidak ada*', inline: true },
                    { name: '🎭 Roles', value: roles, inline: false }
                );
            }
            return interaction.editReply({ embeds: [embed] });
        }
    } catch (err) {
        return interaction.editReply({ content: `❌ Error: \`${err.message}\`` });
    }
}

// ==========================================
// MAIN HANDLER
// ==========================================
async function handleAdminInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return false;
    const cmd = interaction.commandName;
    const allCmds = [
        'lock', 'unlock', 'lockview', 'unlockview',
        'slowmode', 'clear',
        'role',
        'kick', 'ban', 'unban', 'timeout', 'untimeout',
        'welcome',
        'autorole',
        'serverinfo', 'userinfo'
    ];
    if (!allCmds.includes(cmd)) return false;

    try {
        if (['lock', 'unlock', 'lockview', 'unlockview'].includes(cmd)) await handleLock(interaction);
        else if (cmd === 'role') await handleRole(interaction);
        else if (['kick', 'ban', 'unban', 'timeout', 'untimeout'].includes(cmd)) await handleMod(interaction);
        else if (['slowmode', 'clear'].includes(cmd)) await handleUtil(interaction);
        else if (cmd === 'welcome') await handleWelcome(interaction);
        else if (cmd === 'autorole') await handleAutoRole(interaction);
        else if (['serverinfo', 'userinfo'].includes(cmd)) await handleInfo(interaction);
    } catch (err) {
        console.error(`❌ [admin ${cmd}] Error:`, err);
        try {
            const content = `❌ Error: \`${err.message}\``;
            if (interaction.deferred || interaction.replied) await interaction.editReply({ content }).catch(() => {});
            else await interaction.reply({ content, ephemeral: true }).catch(() => {});
        } catch {}
    }
    return true;
}

// ==========================================
// MEMBER JOIN
// ==========================================
async function handleMemberJoin(member) {
    const db = require('./database');

    // Autorole
    try {
        const autoConfig = db.getAutoRoleConfig(member.guild.id);
        if (autoConfig && autoConfig.enabled && autoConfig.roleId) {
            const role = member.guild.roles.cache.get(autoConfig.roleId);
            if (role) {
                const botMember = member.guild.members.me;
                if (role.position < botMember.roles.highest.position) {
                    await member.roles.add(role, 'Autorole — member baru join');
                    console.log(`🎁 Autorole: ${role.name} → ${member.user.username}`);
                }
            }
        }
    } catch (err) { console.error('❌ Autorole error:', err.message); }

    // Welcome
    try {
        const config = db.getWelcomeConfig(member.guild.id);
        if (!config || !config.enabled || !config.channelId) return;
        const ch = await member.guild.channels.fetch(config.channelId).catch(() => null);
        if (!ch) return;
        const text = buildWelcomeMessage(config.message, member, member.guild);
        await ch.send({ embeds: [new EmbedBuilder()
            .setColor(parseColor(config.embedColor) || '#57F287')
            .setTitle('👋 Welcome!')
            .setDescription(text)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `Member #${member.guild.memberCount}` })
            .setTimestamp()] });
        console.log(`👋 Welcome: ${member.user.username}`);
    } catch (err) { console.error('❌ Welcome error:', err.message); }
}

module.exports = {
    ADMIN_COMMANDS,
    handleAdminInteraction,
    handleMemberJoin
};