require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = '1403750417120235571';
const CLIENT_ID = '1372423272255324212';

console.log('🚀 Memulai deploy commands...');
console.log(`📡 Guild ID: ${GUILD_ID}`);
console.log(`🤖 Client ID: ${CLIENT_ID}`);

let ADMIN_COMMANDS = [];
try {
    const admin = require('./admin');
    ADMIN_COMMANDS = admin.ADMIN_COMMANDS || [];
    console.log(`✅ admin.js loaded — ${ADMIN_COMMANDS.length} admin commands`);
} catch (err) {
    console.error('❌ GAGAL LOAD admin.js:', err.message);
    console.error('   Deploy akan lanjut tanpa admin commands.');
    console.error(err.stack);
}

const baseCommands = [
    new SlashCommandBuilder().setName('farming').setDescription('Membuka panel farming').toJSON(),
    new SlashCommandBuilder().setName('event').setDescription('Lihat event yang sedang berjalan').toJSON(),
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
        .setDescription('Reset semua data player')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt => opt.setName('player').setDescription('Player yang mau direset').setRequired(true))
        .toJSON()
];

const commands = [...baseCommands, ...ADMIN_COMMANDS];

console.log(`📦 Total command yang akan didaftarkan: ${commands.length}`);
console.log(`   - Base commands: ${baseCommands.length}`);
console.log(`   - Admin commands: ${ADMIN_COMMANDS.length}`);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('\n⏳ Mengirim ke Discord...');
        const result = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log(`\n✅ BERHASIL! ${result.length} slash command terdaftar di server ${GUILD_ID}`);
        console.log('\n📋 Daftar command:');
        result.forEach(cmd => console.log(`   /${cmd.name}`));
    } catch (error) {
        console.error('\n❌ GAGAL deploy commands:');
        console.error('   Code:', error.code);
        console.error('   Message:', error.message);
        if (error.code === 50001) {
            console.error('\n💡 Missing Access — kemungkinan:');
            console.error('   1. Bot belum di-invite ke server ini');
            console.error('   2. CLIENT_ID atau GUILD_ID salah');
            console.error('   3. Token di .env bukan token bot ini');
        }
        if (error.rawError) console.error('   Details:', JSON.stringify(error.rawError, null, 2));
    }
})();