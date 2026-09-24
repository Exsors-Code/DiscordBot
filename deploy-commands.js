require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = '1403750417120235571';
const CLIENT_ID = '1372423272255324212';

let ADMIN_COMMANDS = [];
let UTILITY_COMMANDS = [];
let UPDATE_COMMANDS = [];

// ==========================================
// LOAD MODULES
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
// HELPER — TAMPILKAN SEMUA COMMAND + SUBCOMMAND + GROUP
// ==========================================
function printCommandTree(cmd) {
    const subs = (cmd.options || []).filter(o => o.type === 1);   // SUB_COMMAND
    const groups = (cmd.options || []).filter(o => o.type === 2); // SUB_COMMAND_GROUP

    // Command tanpa subcommand & tanpa group
    if (subs.length === 0 && groups.length === 0) {
        console.log(`   /${cmd.name}`);
        return;
    }

    console.log(`   /${cmd.name}`);

    // Kalau ada subcommand group
    for (const g of groups) {
        const gSubs = (g.options || []).filter(o => o.type === 1);
        console.log(`     📁 ${g.name}/`);
        for (const gs of gSubs) {
            console.log(`        └─ ${gs.name}`);
        }
    }

    // Subcommand langsung
    for (let i = 0; i < subs.length; i++) {
        const s = subs[i];
        const isLast = i === subs.length - 1;
        const prefix = isLast ? '└─' : '├─';
        console.log(`     ${prefix} ${s.name}`);
    }
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

        // ==========================================
        // TAMPILKAN SEMUA COMMAND + SUBCOMMAND
        // ==========================================
        console.log('\n📋 DAFTAR LENGKAP COMMAND:');
        console.log('='.repeat(60));

        result.sort((a, b) => a.name.localeCompare(b.name));

        let totalSub = 0;
        let totalGroup = 0;

        result.forEach(c => {
            printCommandTree(c);

            const subs = (c.options || []).filter(o => o.type === 1);
            const groups = (c.options || []).filter(o => o.type === 2);

            totalSub += subs.length;
            totalGroup += groups.length;

            groups.forEach(g => {
                totalSub += (g.options || []).filter(o => o.type === 1).length;
            });
        });

        console.log('='.repeat(60));
        console.log(`📊 Total: ${result.length} command utama + ${totalSub} subcommand + ${totalGroup} group`);

        // ==========================================
        // VERIFIKASI KHUSUS
        // ==========================================
        console.log('\n🔍 VERIFIKASI PENTING:');

        // Cek /update sendmulti
        const upd = result.find(c => c.name === 'update');
        if (upd) {
            const subs = (upd.options || []).filter(o => o.type === 1).map(o => o.name);
            const hasSendMulti = subs.includes('sendmulti');
            console.log(`   /update → [${subs.join(', ')}]`);
            console.log(`   ${hasSendMulti ? '✅' : '❌'} sendmulti ${hasSendMulti ? 'AKTIF' : 'TIDAK ADA'}`);
        }

        // Cek /role subcommand
        const role = result.find(c => c.name === 'role');
        if (role) {
            const subs = (role.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /role → [${subs.join(', ')}]`);
        }

        // Cek /automod subcommand
        const auto = result.find(c => c.name === 'automod');
        if (auto) {
            const subs = (auto.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /automod → [${subs.join(', ')}]`);
        }

        // Cek /welcome subcommand
        const welcome = result.find(c => c.name === 'welcome');
        if (welcome) {
            const subs = (welcome.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /welcome → [${subs.join(', ')}]`);
        }

        // Cek /tag subcommand
        const tag = result.find(c => c.name === 'tag');
        if (tag) {
            const subs = (tag.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /tag → [${subs.join(', ')}]`);
        }

        // Cek /warn subcommand
        const warn = result.find(c => c.name === 'warn');
        if (warn) {
            const subs = (warn.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /warn → [${subs.join(', ')}]`);
        }

        // Cek /logging subcommand
        const log = result.find(c => c.name === 'logging');
        if (log) {
            const subs = (log.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /logging → [${subs.join(', ')}]`);
        }

        // Cek /starboard subcommand
        const star = result.find(c => c.name === 'starboard');
        if (star) {
            const subs = (star.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /starboard → [${subs.join(', ')}]`);
        }

        // Cek /reactionrole subcommand
        const rr = result.find(c => c.name === 'reactionrole');
        if (rr) {
            const subs = (rr.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /reactionrole → [${subs.join(', ')}]`);
        }

        // Cek /autorole subcommand
        const ar = result.find(c => c.name === 'autorole');
        if (ar) {
            const subs = (ar.options || []).filter(o => o.type === 1).map(o => o.name);
            console.log(`   /autorole → [${subs.join(', ')}]`);
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