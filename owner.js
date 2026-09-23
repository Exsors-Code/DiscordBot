const OWNER_IDS = [
    '1113777699014582294',   // ← GANTI dengan User ID Discord kamu
];

const PUBLIC_COMMANDS = ['farming', 'event'];
const OWNER_ONLY_ALL = false;

function isOwner(userId) {
    return OWNER_IDS.includes(userId);
}

function checkOwnerOnly(interaction) {
    if (!interaction.isChatInputCommand()) return true;
    if (isOwner(interaction.user.id)) return true;
    if (OWNER_ONLY_ALL) return false;
    if (PUBLIC_COMMANDS.includes(interaction.commandName)) return true;
    return false;
}

async function blockNonOwner(interaction) {
    return interaction.reply({
        content: '🔒 **Command ini hanya bisa dipakai oleh Owner bot.**',
        ephemeral: true
    }).catch(() => {});
}

module.exports = {
    OWNER_IDS, PUBLIC_COMMANDS, OWNER_ONLY_ALL,
    isOwner, checkOwnerOnly, blockNonOwner
};