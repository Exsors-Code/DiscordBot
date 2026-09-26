require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const GUILD_ID = '1403750417120235571';
const CLIENT_ID = '1372423272255324212';

let ADMIN_COMMANDS = [];
let UTILITY_COMMANDS = [];
let UPDATE_COMMANDS = [];
let VOICE_COMMANDS = [];
let TRADE_COMMANDS = [];
let QUEST_COMMANDS = [];

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

try {
    const voice = require('./voice');
    VOICE_COMMANDS = voice.VOICE_COMMANDS || [];
    console.log(`✅ voice.js loaded — ${VOICE_COMMANDS.length} commands`);
} catch (e) { console.error('❌ voice.js:', e.message); }

try {
    const trade = require('./trade');
    TRADE_COMMANDS = trade.TRADE_COMMANDS || [];
    console.log(`✅ trade.js loaded — ${TRADE_COMMANDS.length} commands`);
} catch (e) { console.error('❌ trade.js:', e.message); }

try {
    const quest = require('./dailyquest');
    QUEST_COMMANDS = quest.QUEST_COMMANDS || [];
    console.log(`✅ dailyquest.js loaded — ${QUEST_COMMANDS.length} commands`);
} catch (e) { console.error('❌ dailyquest.js:', e.message); }

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
        .addUserOption(o => o.setName('player').setDescription('Player yang mau direset').setRequired(true)).toJSON(),

    // ===== AFK CHECK =====
    new SlashCommandBuilder().setName('afkcheck').setDescription('⏰ Cek online otomatis saat Auto Farm aktif')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s
            .setName('set')
            .setDescription('Set interval & timeout cek online')
            .addIntegerOption(o => o.setName('interval').setDescription('Berapa menit sekali cek? (default 20)').setRequired(true).setMinValue(1).setMaxValue(1440))
            .addIntegerOption(o => o.setName('timeout').setDescription('Berapa detik sebelum auto farm mati? (default 120)').setRequired(true).setMinValue(10).setMaxValue(600))
            .addBooleanOption(o => o.setName('enabled').setDescription('Aktifkan fitur ini?').setRequired(false))
        )
        .addSubcommand(s => s.setName('status').setDescription('Lihat config AFK Check'))
        .addSubcommand(s => s.setName('disable').setDescription('Matikan fitur AFK Check'))
        .toJSON(),

    // ===== GIVE (owner only) =====
    new SlashCommandBuilder().setName('give')
        .setDescription('🎁 Give item/currency ke user (khusus Event Manager)')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(o => o.setName('item').setDescription('Item yang mau dikasih (ketik untuk search)').setRequired(true).setAutocomplete(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Jumlah').setRequired(false).setMinValue(1).setMaxValue(1000000000))
        .toJSON()
];

// ==========================================
// GABUNG SEMUA
// ==========================================
const commands = [
    ...baseCommands,
    ...ADMIN_COMMANDS,
    ...UTILITY_COMMANDS,
    ...UPDATE_COMMANDS,
    ...VOICE_COMMANDS,
    ...TRADE_COMMANDS,
    ...QUEST_COMMANDS
];

// ==========================================
// ANTI-DUPLIKAT
// ==========================================
const seen = new Set();
const duplicates = [];
for (const cmd of commands) {
    if (seen.has(cmd.name)) duplicates.push(cmd.name);
    seen.add(cmd.name);
}

console.log(`\n📦 Total: ${commands.length} commands`);
console.log(`   - Base: ${baseCommands.length}`);
console.log(`   - Admin: ${ADMIN_COMMANDS.length}`);
console.log(`   - Utility: ${UTILITY_COMMANDS.length}`);
console.log(`   - Update: ${UPDATE_COMMANDS.length}`);
console.log(`   - Voice: ${VOICE_COMMANDS.length}`);
console.log(`   - Trade: ${TRADE_COMMANDS.length}`);
console.log(`   - Quest: ${QUEST_COMMANDS.length}`);

if (duplicates.length > 0) {
    console.error(`\n⚠️ DUPLIKAT COMMAND: ${duplicates.join(', ')}`);
    console.error(`   Fix dulu sebelum deploy!`);
    process.exit(1);
}

// ==========================================
// PRINT TREE
// ==========================================
function printCommandTree(cmd) {
    const subs = (cmd.options || []).filter(o => o.type === 1);
    const groups = (cmd.options || []).filter(o => o.type === 2);
    if (subs.length === 0 && groups.length === 0) { console.log(`   /${cmd.name}`); return; }
    console.log(`   /${cmd.name}`);
    for (const g of groups) {
        const gSubs = (g.options || []).filter(o => o.type === 1);
        console.log(`     📁 ${g.name}/`);
        for (const gs of gSubs) console.log(`        └─ ${gs.name}`);
    }
    for (let i = 0; i < subs.length; i++) {
        const s = subs[i];
        const prefix = (i === subs.length - 1) ? '└─' : '├─';
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
        console.log('\n📋 DAFTAR LENGKAP COMMAND:');
        console.log('='.repeat(60));
        result.sort((a, b) => a.name.localeCompare(b.name));
        let totalSub = 0;
        result.forEach(c => {
            printCommandTree(c);
            const subs = (c.options || []).filter(o => o.type === 1);
            totalSub += subs.length;
        });
        console.log('='.repeat(60));
        console.log(`📊 Total: ${result.length} command + ${totalSub} subcommand`);

        // ===== VERIFIKASI PENTING =====
        console.log('\n🔍 VERIFIKASI:');
        const checks = ['update', 'afkcheck', 'trade', 'quest', 'questadmin', 'give'];
        for (const name of checks) {
            const cmd = result.find(c => c.name === name);
            if (cmd) {
                const subs = (cmd.options || []).filter(o => o.type === 1).map(o => o.name);
                if (subs.length > 0) {
                    console.log(`   ✅ /${name} → [${subs.join(', ')}]`);
                } else {
                    console.log(`   ✅ /${name}`);
                }
            } else {
                console.log(`   ❌ /${name} TIDAK DITEMUKAN`);
            }
        }
    } catch (e) {
        console.error('\n❌ GAGAL deploy:', e.code, e.message);
        if (e.code === 50001) console.error('💡 Missing Access — bot belum di-invite / CLIENT_ID salah.');
        if (e.code === 10062) console.error('💡 Interaction expired — coba lagi.');
    }
})();