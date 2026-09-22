require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = 'MASUKKAN_SERVER_ID_DISINI';
const CLIENT_ID = 'MASUKKAN_APPLICATION_ID_DISINI';

const commands = [
    new SlashCommandBuilder()
        .setName('farming')
        .setDescription('Membuka panel farming')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('event')
        .setDescription('Lihat event yang sedang berjalan')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('customevent')
        .setDescription('Set custom event (khusus Event Manager)')
        .addIntegerOption(opt => opt.setName('gems').setDescription('Gems & XP multiplier').setRequired(true).setMinValue(1).setMaxValue(1000000))
        .addIntegerOption(opt => opt.setName('blocks').setDescription('Blocks return multiplier').setRequired(true).setMinValue(1).setMaxValue(1000000))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup panel & leaderboard untuk server ini')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(opt => opt.setName('panel').setDescription('Channel panel').setRequired(true))
        .addChannelOption(opt => opt.setName('leaderboard').setDescription('Channel leaderboard').setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('unsetup')
        .setDescription('Hapus konfigurasi bot untuk server ini')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('resetplayer')
        .setDescription('Reset semua data player (level, gems, locks, items, dll)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('player').setDescription('Player yang mau direset').setRequired(true))
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Mendaftarkan slash command...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('✅ Berhasil mendaftarkan slash command!');
    } catch (error) { console.error(error); }
})();