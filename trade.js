const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const db = require('./database');

// ==========================================
// SLASH COMMANDS
// ==========================================
const TRADE_COMMANDS = [
    new SlashCommandBuilder()
        .setName('trade')
        .setDescription('🔄 Tukar item dengan player lain')
        .addUserOption(o => o.setName('user').setDescription('Player yang mau ditukar').setRequired(true))
        .toJSON()
];

// ==========================================
// DAFTAR ITEM YANG BISA DI-TRADE
// ==========================================
const TRADE_ITEMS = [
    { key: 'gems',     name: 'Gems',       emoji: '💰' },
    { key: 'wl',       name: 'WL',         emoji: '🔹' },
    { key: 'dl',       name: 'DL',         emoji: '🔸' },
    { key: 'bgl',      name: 'BGL',        emoji: '🔶' },
    { key: 'bglb',     name: 'BGLB',       emoji: '⬛' },
    { key: 'arroz',    name: 'Arroz',      emoji: '🍗' },
    { key: 'clover',   name: 'Clover',     emoji: '🍀' },
    { key: 'gempack',  name: 'Gem Pack',   emoji: '💎' },
    { key: 'xpscroll', name: 'XP Scroll',  emoji: '📜' },
    { key: 'bomb',     name: 'Block Bomb', emoji: '💣' },
    { key: 'timewarp', name: 'Time Warp',  emoji: '⏳' },
    { key: 'gbc',      name: 'GBC',        emoji: '🎰' }
];

// ==========================================
// STATE
// ==========================================
const activeTrades = new Map();
const TRADE_EXPIRE_MS = 10 * 60 * 1000;

// ==========================================
// HELPERS
// ==========================================
function emptyOffer() {
    const o = {};
    for (const it of TRADE_ITEMS) o[it.key] = 0;
    return o;
}

function formatOffer(offer) {
    const lines = [];
    for (const k in offer) {
        if (offer[k] > 0) {
            const it = TRADE_ITEMS.find(i => i.key === k);
            if (it) {
                const val = k === 'gems' ? Math.floor(offer[k]).toLocaleString() : offer[k].toLocaleString();
                lines.push(`${it.emoji} **${val}** ${it.name}`);
            }
        }
    }
    return lines.length ? lines.join('\n') : '*Belum ada item*';
}

function getOwned(ud, key) {
    if (key === 'gems') return Math.floor(ud.gems);
    if (key === 'wl') return ud.locks.wl;
    if (key === 'dl') return ud.locks.dl;
    if (key === 'bgl') return ud.locks.bgl;
    if (key === 'bglb') return ud.locks.bglb;
    return ud.items[key] || 0;
}

function applyTrade(ud, offer, direction) {
    for (const k in offer) {
        if (offer[k] <= 0) continue;
        if (k === 'gems') ud.gems += direction * offer[k];
        else if (k === 'wl') ud.locks.wl += direction * offer[k];
        else if (k === 'dl') ud.locks.dl += direction * offer[k];
        else if (k === 'bgl') ud.locks.bgl += direction * offer[k];
        else if (k === 'bglb') ud.locks.bglb += direction * offer[k];
        else ud.items[k] = (ud.items[k] || 0) + direction * offer[k];
    }
}

function findTradeByUser(userId) {
    for (const t of activeTrades.values()) {
        if (t.user1Id === userId || t.user2Id === userId) return t;
    }
    return null;
}

function isOfferEmpty(offer) {
    for (const k in offer) if (offer[k] > 0) return false;
    return true;
}

// ==========================================
// BUILD PANEL
// ==========================================
function buildTradeEmbed(trade, state = 'active') {
    const status1 = trade.confirm1 ? '✅' : '⏳';
    const status2 = trade.confirm2 ? '✅' : '⏳';
    let color = '#5865F2';
    let title = '🔄 Trade Session';
    let desc = `**${trade.user1Name}** ↔️ **${trade.user2Name}**\n\nKedua pihak klik **✅ Konfirmasi** untuk menyelesaikan trade.`;

    if (state === 'expired') {
        color = '#ED4245';
        title = '🔄 Trade — Expired';
        desc = 'Trade ini kadaluarsa (> 10 menit).';
    } else if (state === 'completed') {
        color = '#57F287';
        title = '✅ Trade Berhasil!';
        desc = `**${trade.user1Name}** ↔️ **${trade.user2Name}**\n\nTrade telah diselesaikan.`;
    } else if (state === 'cancelled') {
        color = '#ED4245';
        title = '❌ Trade Dibatalkan';
        desc = 'Trade dibatalkan oleh salah satu pihak.';
    }

    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(desc)
        .addFields(
            { name: `${status1} Offer dari ${trade.user1Name}`, value: formatOffer(trade.offer1), inline: true },
            { name: `${status2} Offer dari ${trade.user2Name}`, value: formatOffer(trade.offer2), inline: true }
        )
        .setFooter({ text: state === 'active' ? 'Klik tombol sesuai nama kamu • Expire 10 menit' : '' })
        .setTimestamp();
}

function buildTradeButtons(trade, disabled = false) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_add_${trade.user1Id}`).setLabel(`➕ ${trade.user1Name}`).setStyle(ButtonStyle.Primary).setDisabled(disabled),
            new ButtonBuilder().setCustomId(`trade_remove_${trade.user1Id}`).setLabel(`🗑️ ${trade.user1Name}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId(`trade_confirm_${trade.user1Id}`).setLabel(trade.confirm1 ? 'Batalkan Confirm' : '✅ Confirm').setStyle(trade.confirm1 ? ButtonStyle.Secondary : ButtonStyle.Success).setDisabled(disabled)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`trade_add_${trade.user2Id}`).setLabel(`➕ ${trade.user2Name}`).setStyle(ButtonStyle.Primary).setDisabled(disabled),
            new ButtonBuilder().setCustomId(`trade_remove_${trade.user2Id}`).setLabel(`🗑️ ${trade.user2Name}`).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId(`trade_confirm_${trade.user2Id}`).setLabel(trade.confirm2 ? 'Batalkan Confirm' : '✅ Confirm').setStyle(trade.confirm2 ? ButtonStyle.Secondary : ButtonStyle.Success).setDisabled(disabled)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('trade_cancel').setLabel('❌ Batalkan Trade').setStyle(ButtonStyle.Danger).setDisabled(disabled)
        )
    ];
}

// ==========================================
// MAIN HANDLER
// ==========================================
async function handleTradeInteraction(interaction) {
    if (interaction.isChatInputCommand() && interaction.commandName === 'trade') {
        await handleTradeCommand(interaction);
        return true;
    }
    if (interaction.isButton() && interaction.customId.startsWith('trade_')) {
        await handleTradeButton(interaction);
        return true;
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('trade_select_')) {
        await handleTradeSelect(interaction);
        return true;
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith('trade_modal_')) {
        await handleTradeModal(interaction);
        return true;
    }
    return false;
}

// ==========================================
// /trade
// ==========================================
async function handleTradeCommand(interaction) {
    await interaction.deferReply();
    if (!interaction.guild) return interaction.editReply({ content: '❌ Hanya di server.' });

    const target = interaction.options.getUser('user');
    const user1Id = interaction.user.id;
    const user2Id = target.id;

    if (user1Id === user2Id) return interaction.editReply({ content: '❌ Tidak bisa trade dengan diri sendiri.' });
    if (target.bot) return interaction.editReply({ content: '❌ Tidak bisa trade dengan bot.' });

    let ex1 = findTradeByUser(user1Id);
    let ex2 = findTradeByUser(user2Id);

    if (ex1 && Date.now() - ex1.createdAt > TRADE_EXPIRE_MS) {
        activeTrades.delete(ex1.sessionKey);
        ex1 = null;
    }
    if (ex2 && Date.now() - ex2.createdAt > TRADE_EXPIRE_MS) {
        activeTrades.delete(ex2.sessionKey);
        ex2 = null;
    }

    if (ex1 || ex2) return interaction.editReply({ content: '❌ Salah satu dari kalian sedang dalam trade aktif.' });

    const targetMember = await interaction.guild.members.fetch(user2Id).catch(() => null);
    if (!targetMember) return interaction.editReply({ content: '❌ User tidak ada di server.' });

    const sessionKey = `${Date.now()}_${user1Id}_${user2Id}`;
    const trade = {
        sessionKey,
        user1Id,
        user2Id,
        user1Name: interaction.user.username,
        user2Name: target.username,
        guildId: interaction.guild.id,
        offer1: emptyOffer(),
        offer2: emptyOffer(),
        confirm1: false,
        confirm2: false,
        panelChannelId: interaction.channel.id,
        panelMessageId: null,
        createdAt: Date.now()
    };

    const panelMsg = await interaction.editReply({
        content: `<@${user2Id}> — kamu di-invite trade oleh <@${user1Id}>`,
        embeds: [buildTradeEmbed(trade)],
        components: buildTradeButtons(trade)
    });

    trade.panelMessageId = panelMsg.id;
    activeTrades.set(sessionKey, trade);
    console.log(`🔄 [Trade] ${user1Id} ↔ ${user2Id} dimulai`);
}

// ==========================================
// BUTTON HANDLER
// ==========================================
async function handleTradeButton(interaction) {
    const userId = interaction.user.id;

    // Cancel
    if (interaction.customId === 'trade_cancel') {
        const trade = findTradeByUser(userId);
        if (!trade) return interaction.reply({ content: '❌ Tidak ada trade aktif.', ephemeral: true });

        activeTrades.delete(trade.sessionKey);
        try {
            await interaction.update({
                content: '',
                embeds: [buildTradeEmbed(trade, 'cancelled')],
                components: buildTradeButtons(trade, true)
            });
        } catch {}
        return;
    }

    const parts = interaction.customId.split('_');
    if (parts.length < 3) return interaction.reply({ content: '❌ Invalid.', ephemeral: true });

    const action = parts[1];
    const targetUserId = parts[2];

    if (userId !== targetUserId) {
        return interaction.reply({ content: `❌ Tombol ini hanya untuk <@${targetUserId}>.`, ephemeral: true });
    }

    const trade = findTradeByUser(userId);
    if (!trade) return interaction.reply({ content: '❌ Trade sudah tidak aktif.', ephemeral: true });

    if (Date.now() - trade.createdAt > TRADE_EXPIRE_MS) {
        activeTrades.delete(trade.sessionKey);
        try {
            await interaction.update({
                embeds: [buildTradeEmbed(trade, 'expired')],
                components: buildTradeButtons(trade, true)
            });
        } catch {}
        return;
    }

    // ===== ADD =====
    if (action === 'add') {
        const ud = db.getUser(userId, interaction.user.username);
        const options = [];
        for (const item of TRADE_ITEMS) {
            const owned = getOwned(ud, item.key);
            if (owned > 0) {
                const ownedText = item.key === 'gems' ? Math.floor(owned).toLocaleString() : owned.toLocaleString();
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`${item.name} (${ownedText})`)
                    .setValue(item.key)
                    .setEmoji(item.emoji)
                );
            }
        }

        if (options.length === 0) return interaction.reply({ content: '❌ Kamu tidak punya item yang bisa di-trade.', ephemeral: true });

        const dropdown = new StringSelectMenuBuilder()
            .setCustomId(`trade_select_add_${userId}`)
            .setPlaceholder('Pilih item yang mau ditambahkan')
            .addOptions(options.slice(0, 25));

        return interaction.reply({
            content: '➕ **Pilih item yang mau kamu tambahkan ke offer:**',
            components: [new ActionRowBuilder().addComponents(dropdown)],
            ephemeral: true
        });
    }

    // ===== REMOVE =====
    if (action === 'remove') {
        const isUser1 = trade.user1Id === userId;
        const offer = isUser1 ? trade.offer1 : trade.offer2;
        const options = [];
        for (const item of TRADE_ITEMS) {
            if (offer[item.key] > 0) {
                const val = item.key === 'gems' ? Math.floor(offer[item.key]).toLocaleString() : offer[item.key].toLocaleString();
                options.push(new StringSelectMenuOptionBuilder()
                    .setLabel(`${item.name} (${val})`)
                    .setValue(item.key)
                    .setEmoji(item.emoji)
                );
            }
        }

        if (options.length === 0) return interaction.reply({ content: '❌ Offer kamu kosong.', ephemeral: true });

        const dropdown = new StringSelectMenuBuilder()
            .setCustomId(`trade_select_remove_${userId}`)
            .setPlaceholder('Pilih item yang mau dihapus')
            .addOptions(options);

        return interaction.reply({
            content: '🗑️ **Pilih item yang mau kamu hapus:**',
            components: [new ActionRowBuilder().addComponents(dropdown)],
            ephemeral: true
        });
    }

    // ===== CONFIRM =====
    if (action === 'confirm') {
        const isUser1 = trade.user1Id === userId;

        // Cek offer tidak kosong
        const myOffer = isUser1 ? trade.offer1 : trade.offer2;
        if (isOfferEmpty(myOffer)) {
            return interaction.reply({ content: '❌ Offer kamu masih kosong. Tambah item dulu.', ephemeral: true });
        }

        if (isUser1) trade.confirm1 = !trade.confirm1;
        else trade.confirm2 = !trade.confirm2;

        if (trade.confirm1 && trade.confirm2) {
            return await executeTrade(interaction, trade);
        }

        try {
            await interaction.update({
                embeds: [buildTradeEmbed(trade)],
                components: buildTradeButtons(trade)
            });
        } catch {}
        return;
    }
}

// ==========================================
// SELECT HANDLER
// ==========================================
async function handleTradeSelect(interaction) {
    const userId = interaction.user.id;
    const parts = interaction.customId.split('_');
    if (parts.length < 4) return interaction.update({ content: '❌ Invalid.', components: [] });

    const action = parts[2];
    const targetUserId = parts[3];

    if (userId !== targetUserId) return interaction.update({ content: `❌ Bukan untuk kamu.`, components: [] });

    const itemKey = interaction.values[0];
    const itemInfo = TRADE_ITEMS.find(i => i.key === itemKey);
    if (!itemInfo) return interaction.update({ content: '❌ Item invalid.', components: [] });

    const trade = findTradeByUser(userId);
    if (!trade) return interaction.update({ content: '❌ Trade sudah tidak aktif.', components: [] });

    if (action === 'add') {
        const modal = new ModalBuilder()
            .setCustomId(`trade_modal_add_${userId}_${itemKey}`)
            .setTitle(`Tambah ${itemInfo.name}`);

        const input = new TextInputBuilder()
            .setCustomId('amount')
            .setLabel(`Berapa ${itemInfo.name}?`)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: 100')
            .setRequired(true)
            .setMaxLength(12);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (action === 'remove') {
        const isUser1 = trade.user1Id === userId;
        const offer = isUser1 ? trade.offer1 : trade.offer2;
        offer[itemKey] = 0;

        if (isUser1) trade.confirm1 = false;
        else trade.confirm2 = false;

        try {
            const ch = await interaction.client.channels.fetch(trade.panelChannelId).catch(() => null);
            if (ch) {
                const msg = await ch.messages.fetch(trade.panelMessageId).catch(() => null);
                if (msg) await msg.edit({ embeds: [buildTradeEmbed(trade)], components: buildTradeButtons(trade) });
            }
        } catch {}

        return interaction.update({ content: `🗑️ **${itemInfo.name}** dihapus dari offer.`, components: [] });
    }
}

// ==========================================
// MODAL HANDLER
// ==========================================
async function handleTradeModal(interaction) {
    const userId = interaction.user.id;
    const parts = interaction.customId.split('_');
    if (parts.length < 5) return interaction.reply({ content: '❌ Invalid.', ephemeral: true });

    const action = parts[2];
    const targetUserId = parts[3];
    const itemKey = parts[4];

    if (userId !== targetUserId) return interaction.reply({ content: '❌ Bukan untuk kamu.', ephemeral: true });
    if (action !== 'add') return interaction.reply({ content: '❌ Invalid action.', ephemeral: true });

    const trade = findTradeByUser(userId);
    if (!trade) return interaction.reply({ content: '❌ Trade sudah tidak aktif.', ephemeral: true });

    const itemInfo = TRADE_ITEMS.find(i => i.key === itemKey);
    if (!itemInfo) return interaction.reply({ content: '❌ Item invalid.', ephemeral: true });

    const amountRaw = interaction.fields.getTextInputValue('amount');
    const amount = parseInt(amountRaw);
    if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Jumlah tidak valid.', ephemeral: true });

    const ud = db.getUser(userId, interaction.user.username);
    const owned = getOwned(ud, itemKey);
    const isUser1 = trade.user1Id === userId;
    const offer = isUser1 ? trade.offer1 : trade.offer2;
    const already = offer[itemKey] || 0;
    const remaining = owned - already;

    if (amount > remaining) {
        return interaction.reply({ 
            content: `❌ Kamu hanya punya **${remaining.toLocaleString()}** ${itemInfo.name} tersisa.`, 
            ephemeral: true 
        });
    }

    offer[itemKey] = (offer[itemKey] || 0) + amount;

    if (isUser1) trade.confirm1 = false;
    else trade.confirm2 = false;

    try {
        const ch = await interaction.client.channels.fetch(trade.panelChannelId).catch(() => null);
        if (ch) {
            const msg = await ch.messages.fetch(trade.panelMessageId).catch(() => null);
            if (msg) await msg.edit({ embeds: [buildTradeEmbed(trade)], components: buildTradeButtons(trade) });
        }
    } catch {}

    return interaction.reply({
        content: `✅ **+${amount.toLocaleString()} ${itemInfo.name}** ditambahkan ke offer kamu.`,
        ephemeral: true
    });
}

// ==========================================
// EXECUTE TRADE
// ==========================================
async function executeTrade(interaction, trade) {
    const ud1 = db.getUser(trade.user1Id, trade.user1Name);
    const ud2 = db.getUser(trade.user2Id, trade.user2Name);

    // Validasi ulang
    for (const k in trade.offer1) {
        if (trade.offer1[k] <= 0) continue;
        if (getOwned(ud1, k) < trade.offer1[k]) {
            activeTrades.delete(trade.sessionKey);
            return interaction.update({
                content: `❌ Trade gagal! <@${trade.user1Id}> tidak punya cukup ${TRADE_ITEMS.find(i => i.key === k)?.name || k}.`,
                embeds: [buildTradeEmbed(trade, 'cancelled')],
                components: buildTradeButtons(trade, true)
            });
        }
    }
    for (const k in trade.offer2) {
        if (trade.offer2[k] <= 0) continue;
        if (getOwned(ud2, k) < trade.offer2[k]) {
            activeTrades.delete(trade.sessionKey);
            return interaction.update({
                content: `❌ Trade gagal! <@${trade.user2Id}> tidak punya cukup ${TRADE_ITEMS.find(i => i.key === k)?.name || k}.`,
                embeds: [buildTradeEmbed(trade, 'cancelled')],
                components: buildTradeButtons(trade, true)
            });
        }
    }

    // Eksekusi
    applyTrade(ud1, trade.offer1, -1);
    applyTrade(ud2, trade.offer1, 1);
    applyTrade(ud2, trade.offer2, -1);
    applyTrade(ud1, trade.offer2, 1);

    db.saveUser(ud1);
    db.saveUser(ud2);

    activeTrades.delete(trade.sessionKey);

    try {
        await interaction.update({
            content: '',
            embeds: [buildTradeEmbed(trade, 'completed')],
            components: []
        });
    } catch {}

    console.log(`🔄 [Trade] Berhasil: ${trade.user1Id} ↔ ${trade.user2Id}`);
}

module.exports = {
    TRADE_COMMANDS,
    handleTradeInteraction
};