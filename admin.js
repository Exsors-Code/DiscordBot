const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

const ADMIN_COMMANDS = [
    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 Lock channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON(),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 Unlock channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON(),

    new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('🐢 Set slowmode')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(o => o.setName('seconds').setDescription('Detik').setRequired(true).setMinValue(0).setMaxValue(21600))
        .toJSON(),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🗑️ Hapus pesan')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(o => o.setName('amount').setDescription('Jumlah (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .toJSON(),

    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('ℹ️ Info server')
        .toJSON()
];

async function handleAdminInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return false;
    const cmd = interaction.commandName;
    const adminCmds = ['lock', 'unlock', 'slowmode', 'clear', 'serverinfo'];
    if (!adminCmds.includes(cmd)) return false;

    try {
        if (cmd === 'lock' || cmd === 'unlock') {
            const ch = interaction.options.getChannel('channel') || interaction.channel;
            if (!ch.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: `❌ Bot tidak punya permission.`, ephemeral: true });
            }
            await interaction.deferReply({ ephemeral: true });
            const everyone = interaction.guild.roles.everyone;
            if (cmd === 'lock') {
                await ch.permissionOverwrites.edit(everyone, { SendMessages: false }, { reason: `Lock oleh ${interaction.user.username}` });
            } else {
                await ch.permissionOverwrites.edit(everyone, { SendMessages: null }, { reason: `Unlock oleh ${interaction.user.username}` });
            }
            const embed = new EmbedBuilder()
                .setColor(cmd === 'lock' ? '#ED4245' : '#57F287')
                .setDescription(cmd === 'lock' ? `🔒 Channel di-lock oleh ${interaction.user}` : `🔓 Channel di-unlock oleh ${interaction.user}`)
                .setTimestamp();
            try { await ch.send({ embeds: [embed] }); } catch {}
            return interaction.editReply({ content: `✅ Berhasil ${cmd} ${ch}` });
        }

        if (cmd === 'slowmode') {
            await interaction.deferReply({ ephemeral: true });
            const sec = interaction.options.getInteger('seconds');
            await interaction.channel.setRateLimitPerUser(sec);
            return interaction.editReply({ content: sec === 0 ? `🐢 Slowmode off` : `🐢 Slowmode ${sec}s` });
        }

        if (cmd === 'clear') {
            await interaction.deferReply({ ephemeral: true });
            const amount = interaction.options.getInteger('amount');
            const msgs = await interaction.channel.messages.fetch({ limit: amount });
            await interaction.channel.bulkDelete(msgs, true);
            return interaction.editReply({ content: `🗑️ ${msgs.size} pesan dihapus.` });
        }

        if (cmd === 'serverinfo') {
            await interaction.deferReply();
            const g = interaction.guild;
            return interaction.editReply({ embeds: [new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`ℹ️ ${g.name}`)
                .addFields(
                    { name: '👑 Owner', value: `<@${g.ownerId}>`, inline: true },
                    { name: '👥 Member', value: `${g.memberCount}`, inline: true },
                    { name: '🎭 Roles', value: `${g.roles.cache.size}`, inline: true }
                )] });
        }
    } catch (err) {
        console.error(`❌ admin ${cmd}:`, err);
        try {
            if (interaction.deferred) await interaction.editReply({ content: `❌ ${err.message}` });
            else await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
        } catch {}
    }
    return true;
}

async function handleMemberJoin(member) {
    // Welcome placeholder
}

module.exports = { ADMIN_COMMANDS, handleAdminInteraction, handleMemberJoin };