// ==========================================
// 🔒 OWNER CONFIG
// ==========================================

// Masukkan User ID kamu di sini
// Cara ambil: Discord Settings → Advanced → Developer Mode ON
// Lalu klik kanan avatar sendiri → Copy User ID
const OWNER_IDS = [
    '1113777699014582294',
    // Bisa tambah lebih dari 1 owner, pisahkan koma:
    // '123456789012345678',
    // '987654321098765432'
];

// Command yang SEMUA user boleh pakai
// (farming & event biar player bisa main)
const PUBLIC_COMMANDS = ['farming', 'event'];

// Kalau true, SEMUA command owner-only (termasuk farming)
// Kalau false, hanya command di luar PUBLIC_COMMANDS yang owner-only
const OWNER_ONLY_ALL = false;

// ==========================================
// HELPER
// ==========================================
function isOwner(userId) {
    return OWNER_IDS.includes(userId);
}

function checkOwnerOnly(interaction) {
    // Bukan chat command → biarkan lewat (tombol, modal, dll)
    if (!interaction.isChatInputCommand()) return true;

    // Owner selalu bisa
    if (isOwner(interaction.user.id)) return true;

    // Mode: semua command owner only
    if (OWNER_ONLY_ALL) return false;

    // Command public → boleh siapa saja
    const cmd = interaction.commandName;
    if (PUBLIC_COMMANDS.includes(cmd)) return true;

    // Sisanya owner only
    return false;
}

async function blockNonOwner(interaction) {
    return interaction.reply({
        content: '🔒 **Command ini hanya bisa dipakai oleh Owner bot.**\n> Kamu tidak punya akses ke command ini.',
        ephemeral: true
    }).catch(() => {});
}

module.exports = {
    OWNER_IDS,
    PUBLIC_COMMANDS,
    OWNER_ONLY_ALL,
    isOwner,
    checkOwnerOnly,
    blockNonOwner
};