require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = '1403750417120235571';
const CLIENT_ID = '1372423272255324212';

let ADMIN_COMMANDS = [];
let UTILITY_COMMANDS = [];

try {
    const admin = require('./admin');
    ADMIN_COMMANDS = admin.ADMIN_COMMANDS || [];
    console.log(`✅ admin.js loaded — ${ADMIN_COMMANDS.length} commands`);
} catch (e) { console.error('❌ admin.js:', e.message); }

try {
    const utility = require('./utility');
    UTILITY_COMMANDS = utility.UTILITY_COMMANDS || [];
    console.log(`✅ utility.js loaded — ${UTILITY_COMMANDS.length} commands`);
} catch (e) { console.error('❌ utility.js:', e.message); }

const baseCommands = [
    new SlashCommandBuilder().setName('farming').setDescription('Membuka panel farming').toJSON(),
    new SlashCommandBuilder().setName('event').setDescription('Lihat event').toJSON(),
    new SlashCommandBuilder().setName('customevent').setDescription('Set custom event')
        .addIntegerOption(o => o.setName('gems').setDescription('Gems mult').setRequired(true).setMinValue(1).setMaxValue(1000000))
        .addIntegerOption(o => o.setName('blocks').setDescription('Blocks mult').setRequired(true).setMinValue(1).setMaxValue(1000000))
        .toJSON(),
    new SlashCommandBuilder().setName('setup').setDescription('Setup panel & leaderboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('panel').setDescription('Panel channel').setRequired(true))
        .addChannelOption(o => o.setName('leaderboard').setDescription('Leaderboard channel').setRequired(true))
        .toJSON(),
    new SlashCommandBuilder().setName('unsetup').setDescription('Hapus config')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).toJSON(),
    new SlashCommandBuilder().setName('resetplayer').setDescription('Reset player data')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(o => o.setName('player').setDescription('Player').setRequired(true)).toJSON()
];

const commands = [...baseCommands, ...ADMIN_COMMANDS, ...UTILITY_COMMANDS];
console.log(`📦 Total: ${commands.length} commands (${baseCommands.length} base + ${ADMIN_COMMANDS.length} admin + ${UTILITY_COMMANDS.length} utility)`);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('\n⏳ Sending to Discord...');
        const result = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log(`\n✅ BERHASIL! ${result.length} commands registered.`);
        console.log('\n📋 Commands:');
        result.forEach(c => console.log(`   /${c.name}`));
    } catch (e) {
        console.error('\n❌ GAGAL:', e.code, e.message);
        if (e.code === 50001) console.error('💡 Missing Access — invite bot dulu / cek ID.');
    }
})();