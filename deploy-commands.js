require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = '1403750417120235571';
const CLIENT_ID = '1372423272255324212';

let ADMIN_COMMANDS = [];
let UTILITY_COMMANDS = [];
let UPDATE_COMMANDS = [];

// ==========================================
// LOAD MODULES (dengan validasi)
// ==========================================
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

try {
    const update = require('./update');
    UPDATE_COMMANDS = update.UPDATE_COMMANDS || [];
    console.log(`✅ update.js loaded — ${UPDATE_COMMANDS.length} commands`);

    // ===== BARU — validasi subcommand sendmulti =====
    const updateCmd = UPDATE_COMMANDS.find(c => c.name === 'update');
    if (updateCmd) {
        const subs = (updateCmd.options || []).filter(o => o.type === 1).map(o => o.name);
        console.log(`   └─ Subcommands: ${subs.join(', ')}`);
        if (subs.includes('sendmulti')) {
            console.log(`   ✅ /update sendmulti TERDETEKSI`);
        } else {
            console.warn(`   ⚠️ /update sendmulti TIDAK ditemukan! Cek update.js`);
        }
    }
} catch (e) { console.error('❌ update.js:', e.message); }

// ==========================================
// BASE COMMANDS
// ==========================================
const baseCommands = [
    new SlashCommandBuilder().setName('farming').setDescription('Membuka panel farming').toJSON(),
    new SlashCommandBuilder().setName('event').setDescription('Lihat event').toJSON(),
    new SlashCommandBuilder().setName('customevent').setDescription('Set custom event (khusus Event Manager)')
        .addIntegerOption(o => o.setName('gems').setDescription('Gems & XP multiplier').setRequired(true).setMinValue(1).setMaxValue(1000000))
        .addIntegerOption(o => o.setName('blocks').setDescription('Blocks return multiplier').setRequired(true).setMinValue(1).setMaxValue(1000000))
        .toJSON(),
    new SlashCommandBuilder().setName('setup').setDescription('Setup panel & leaderboard untuk server ini')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(o => o.setName('panel').setDescription('Channel panel').setRequired(true))
        .addChannelOption(o => o.setName('leaderboard').setDescription('Channel leaderboard').setRequired(true))
        .toJSON(),
    new SlashCommandBuilder().setName('unsetup').setDescription('Hapus konfigurasi bot untuk server ini')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).toJSON(),
    new SlashCommandBuilder().setName('resetplayer').setDescription('Reset semua data player')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(o => o.setName('player').setDescription('Player yang mau direset').setRequired(true)).toJSON()
];

// ==========================================
// GABUNG SEMUA
// ==========================================
const commands = [
    ...baseCommands,
    ...ADMIN_COMMANDS,
    ...UTILITY_COMMANDS,
    ...UPDATE_COMMANDS
];

// ==========================================
// ANTI-DUPLIKAT
// ==========================================
const seen = new Set();
const duplicates = [];
for (const cmd of commands) {
    if (seen.has(cmd.name)) {
        duplicates.push(cmd.name);
    }
    seen.add(cmd.name);
}

console.log(`\n📦 Total: ${commands.length} commands`);
console.log(`   - Base: ${baseCommands.length}`);
console.log(`   - Admin: ${ADMIN_COMMANDS.length}`);
console.log(`   - Utility: ${UTILITY_COMMANDS.length}`);
console.log(`   - Update: ${UPDATE_COMMANDS.length}`);

if (duplicates.length > 0) {
    console.error(`\n⚠️ DUPLIKAT COMMAND: ${duplicates.join(', ')}`);
    console.error(`   Fix dulu sebelum deploy!`);
    process.exit(1);
}

// ==========================================
// DEPLOY
// ==========================================
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('\n⏳ Sending to Discord...');
        const result = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log(`\n✅ BERHASIL! ${result.length} commands registered.`);

        // ===== Tampilkan daftar command =====
        console.log('\n📋 Daftar command:');
        result.sort((a, b) => a.name.localeCompare(b.name));
        result.forEach(c => {
            const subs = (c.options || []).filter(o => o.type === 1).map(o => o.name);
            if (subs.length > 0) {
                console.log(`   /${c.name} → [${subs.join(', ')}]`);
            } else {
                console.log(`   /${c.name}`);
            }
        });

        // ===== Cek khusus /update =====
        const upd = result.find(c => c.name === 'update');
        if (upd) {
            const subs = (upd.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`\n🔍 /update subcommands: ${subs.join(', ')}`);
            if (subs.includes('sendmulti')) {
                console.log(`   ✅ sendmulti AKTIF`);
            } else {
                console.log(`   ❌ sendmulti TIDAK ADA — cek update.js`);
            }
        }
    } catch (e) {
        console.error('\n❌ GAGAL deploy:', e.code, e.message);
        if (e.code === 50001) {
            console.error('💡 Missing Access — bot belum di-invite ke server, atau CLIENT_ID/GUILD_ID salah.');
        }
        if (e.code === 10062) {
            console.error('💡 Interaction expired — coba lagi.');
        }
    }
})();