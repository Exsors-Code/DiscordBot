const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    UserSelectMenuBuilder
} = require('discord.js');

// ==========================================
// KONFIGURASI
// ==========================================
const DEFAULT_CATEGORY_NAME = '🔊 Private Voice';

// ==========================================
// SLASH COMMANDS
// ==========================================
const VOICE_COMMANDS = [
    new SlashCommandBuilder()
        .setName('makevoice')
        .setDescription('🔊 Bikin private voice channel')
        .addStringOption(o => o.setName('name').setDescription('Nama voice').setRequired(false).setMaxLength(100))
        .addIntegerOption(o => o.setName('limit').setDescription('Max user (0 = unlimited)').setRequired(false).setMinValue(0).setMaxValue(99))
        .addChannelOption(o => o
            .setName('category')
            .setDescription('Kategori tempat voice dibuat')
            .setRequired(false)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .toJSON()
];

// ==========================================
// STATE (in-memory)
// ==========================================
const activeVoices = new Map(); // channelId -> { ownerId, guildId, panelChannelId, panelMessageId, locked, userLimit, emptyTimer, categoryId }

function getVoiceByOwner(userId) {
    for (const [cid, d] of activeVoices) if (d.ownerId === userId) return { channelId: cid, ...d };
    return null;
}
function getVoiceByChannel(channelId) {
    const d = activeVoices.get(channelId);
    return d ? { channelId, ...d } : null;
}
function getVoiceByPanelMessage(messageId) {
    for (const [cid, d] of activeVoices) if (d.panelMessageId === messageId) return { channelId: cid, ...d };
    return null;
}

// ==========================================
// HELPER — CARI / BIKIN CATEGORY
// ==========================================
async function resolveCategory(guild, selectedCategory, botMember) {
    if (selectedCategory) {
        const perms = selectedCategory.permissionsFor(botMember);
        if (!perms || !perms.has(PermissionFlagsBits.ManageChannels)) {
            return { error: `Bot tidak punya izin **Manage Channels** di kategori ${selectedCategory}.` };
        }
        return { category: selectedCategory };
    }

    let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === DEFAULT_CATEGORY_NAME
    );

    if (!category) {
        try {
            category = await guild.channels.create({
                name: DEFAULT_CATEGORY_NAME,
                type: ChannelType.GuildCategory,
                reason: 'Auto-create kategori private voice'
            });
            console.log(`📁 [Voice] Kategori baru dibuat: ${DEFAULT_CATEGORY_NAME}`);
        } catch (e) {
            return { error: `Gagal buat kategori: ${e.message}` };
        }
    }

    return { category };
}

// ==========================================
// PANEL
// ==========================================
function buildPanelEmbed(vc, data) {
    const lock = data.locked ? '🔒 **Private**' : '🔓 **Public**';
    const limit = data.userLimit === 0 ? '∞' : data.userLimit;
    const members = vc.members ? vc.members.size : 0;
    const parent = vc.parent ? vc.parent.name : '-';
    return new EmbedBuilder()
        .setColor(data.locked ? '#ED4245' : '#57F287')
        .setTitle(`🔊 Voice Control — ${vc.name}`)
        .setDescription(
            `**Owner:** <@${data.ownerId}>\n` +
            `**Voice:** <#${vc.id}>\n` +
            `**Kategori:** 📁 ${parent}\n` +
            `**Status:** ${lock}\n` +
            `**Limit:** ${limit} user\n` +
            `**Member sekarang:** ${members}\n\n` +
            `> Hanya <@${data.ownerId}> yang bisa pakai tombol di bawah.\n` +
            `> Voice otomatis **terhapus** kalau kosong.`
        )
        .setFooter({ text: 'GrowExs Private Voice' })
        .setTimestamp();
}

function buildPanelButtons(data) {
    const r1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('vc_lock')
            .setLabel(data.locked ? '🔓 Unlock' : '🔒 Lock')
            .setStyle(data.locked ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('vc_rename').setLabel('✏️ Rename').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('vc_limit').setLabel('👥 Set Limit').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('vc_invite').setLabel('➕ Invite').setStyle(ButtonStyle.Primary)
    );
    const r2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vc_kick').setLabel('👢 Kick').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_claim').setLabel('👑 Claim').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('vc_delete').setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger)
    );
    return [r1, r2];
}

async function updatePanel(client, channelId) {
    const data = activeVoices.get(channelId);
    if (!data || !data.panelMessageId) return;
    try {
        const ch = await client.channels.fetch(data.panelChannelId).catch(() => null);
        if (!ch) return;
        const msg = await ch.messages.fetch(data.panelMessageId).catch(() => null);
        if (!msg) return;
        const vc = await client.channels.fetch(channelId).catch(() => null);
        if (!vc) return;
        await msg.edit({ embeds: [buildPanelEmbed(vc, data)], components: buildPanelButtons(data) });
    } catch (e) { /* silent */ }
}

// ==========================================
// HELPER — UPDATE PANEL JADI "DIHAPUS"
// ==========================================
async function markPanelDeleted(client, data, reason = 'Voice telah dihapus.') {
    try {
        const ch = await client.channels.fetch(data.panelChannelId).catch(() => null);
        if (!ch) return;
        const msg = await ch.messages.fetch(data.panelMessageId).catch(() => null);
        if (!msg) return;
        await msg.edit({
            embeds: [new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('🗑️ Voice Dihapus')
                .setDescription(reason)
                .setTimestamp()],
            components: []
        }).catch(() => {});
    } catch (e) { /* silent */ }
}

// ==========================================
// MAIN HANDLER
// ==========================================
async function handleVoiceInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName !== 'makevoice') return false;
        return handleMakeVoice(interaction);
    }
    if (interaction.isButton() && interaction.customId.startsWith('vc_')) {
        return handleVoiceButton(interaction);
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith('vc_modal_')) {
        return handleVoiceModal(interaction);
    }
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('vc_select_')) {
        return handleVoiceSelect(interaction);
    }
    return false;
}

// ==========================================
// /makevoice
// ==========================================
async function handleMakeVoice(interaction) {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guild) return interaction.editReply({ content: '❌ Hanya di server.' });

    const botMember = interaction.guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.editReply({ content: '❌ Bot butuh izin **Manage Channels**.' });
    }

    const existing = getVoiceByOwner(interaction.user.id);
    if (existing) {
        const ch = await interaction.guild.channels.fetch(existing.channelId).catch(() => null);
        if (ch) {
            return interaction.editReply({
                content: `❌ Kamu sudah punya voice: <#${existing.channelId}>\n> Hapus dulu yang lama untuk membuat baru.`
            });
        }
        activeVoices.delete(existing.channelId);
    }

    const name = interaction.options.getString('name') || `🔊 ${interaction.user.username}`;
    const limit = interaction.options.getInteger('limit') ?? 0;
    const selectedCategory = interaction.options.getChannel('category');

    const catRes = await resolveCategory(interaction.guild, selectedCategory, botMember);
    if (catRes.error) return interaction.editReply({ content: `❌ ${catRes.error}` });
    const category = catRes.category;

    let channel;
    try {
        channel = await interaction.guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: category.id,
            userLimit: limit,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.Connect] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] }
            ],
            reason: `Private voice untuk ${interaction.user.username}`
        });
    } catch (e) {
        return interaction.editReply({ content: `❌ Gagal buat voice: ${e.message}` });
    }

    let panelMsg;
    try {
        panelMsg = await interaction.channel.send({
            embeds: [buildPanelEmbed(channel, { ownerId: interaction.user.id, locked: true, userLimit: limit })],
            components: buildPanelButtons({ ownerId: interaction.user.id, locked: true, userLimit: limit })
        });
    } catch (e) {
        await channel.delete().catch(() => {});
        return interaction.editReply({ content: `❌ Gagal kirim panel: ${e.message}` });
    }

    activeVoices.set(channel.id, {
        ownerId: interaction.user.id,
        guildId: interaction.guild.id,
        panelChannelId: interaction.channel.id,
        panelMessageId: panelMsg.id,
        locked: true,
        userLimit: limit,
        emptyTimer: null,
        categoryId: category.id
    });

    try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (member.voice.channel) await member.voice.setChannel(channel).catch(() => {});
    } catch {}

    return interaction.editReply({
        embeds: [new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Private Voice Dibuat!')
            .setDescription(
                `**Voice kamu:** <#${channel.id}>\n` +
                `**Kategori:** 📁 ${category.name}\n` +
                `**Panel:** <#${interaction.channel.id}> (di bawah panel ini)\n\n` +
                `> Klik **voice** di atas untuk join.\n` +
                `> Kelola lewat panel dengan tombol 🔒 ✏️ 👥 ➕ 👢 👑 🗑️`
            )
            .setFooter({ text: 'GrowExs Private Voice' })
            .setTimestamp()
        ]
    });
}

// ==========================================
// BUTTON HANDLER
// ==========================================
async function handleVoiceButton(interaction) {
    const data = getVoiceByPanelMessage(interaction.message.id);
    if (!data) {
        return interaction.reply({ content: '❌ Panel sudah tidak aktif. Buat ulang dengan `/makevoice`.', ephemeral: true });
    }
    if (interaction.user.id !== data.ownerId) {
        return interaction.reply({ content: '🔒 Hanya owner voice yang bisa pakai tombol ini.', ephemeral: true });
    }

    const vc = await interaction.guild.channels.fetch(data.channelId).catch(() => null);
    if (!vc) {
        activeVoices.delete(data.channelId);
        await markPanelDeleted(interaction.client, data, 'Voice sudah tidak ada.');
        return interaction.reply({ content: '❌ Voice sudah tidak ada.', ephemeral: true });
    }

    const id = interaction.customId;

    if (id === 'vc_lock') {
        const newLocked = !data.locked;
        try {
            await vc.permissionOverwrites.edit(interaction.guild.id, {
                Connect: newLocked ? false : null
            });
        } catch (e) {
            return interaction.reply({ content: `❌ Gagal: ${e.message}`, ephemeral: true });
        }
        data.locked = newLocked;
        await interaction.deferUpdate().catch(() => {});
        await updatePanel(interaction.client, data.channelId);
        return;
    }

    if (id === 'vc_delete') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vc_confirm_delete').setLabel('✅ Ya, Hapus').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('vc_cancel_delete').setLabel('❌ Batal').setStyle(ButtonStyle.Secondary)
        );
        return interaction.reply({
            content: `⚠️ Yakin mau hapus <#${data.channelId}>?`,
            components: [row],
            ephemeral: true
        });
    }

    if (id === 'vc_rename') {
        const modal = new ModalBuilder().setCustomId('vc_modal_rename').setTitle('Rename Voice');
        const input = new TextInputBuilder()
            .setCustomId('name').setLabel('Nama baru')
            .setStyle(TextInputStyle.Short)
            .setValue(vc.name)
            .setMaxLength(100)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (id === 'vc_limit') {
        const modal = new ModalBuilder().setCustomId('vc_modal_limit').setTitle('Set User Limit');
        const input = new TextInputBuilder()
            .setCustomId('limit').setLabel('Limit user (0 = unlimited, max 99)')
            .setStyle(TextInputStyle.Short)
            .setValue(String(data.userLimit))
            .setMaxLength(2)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (id === 'vc_invite') {
        const select = new UserSelectMenuBuilder()
            .setCustomId('vc_select_invite')
            .setPlaceholder('Pilih user untuk di-invite')
            .setMinValues(1)
            .setMaxValues(10);
        return interaction.reply({
            content: '➕ Pilih user yang mau di-invite:',
            components: [new ActionRowBuilder().addComponents(select)],
            ephemeral: true
        });
    }

    if (id === 'vc_kick') {
        const members = vc.members.filter(m => m.id !== data.ownerId);
        if (members.size === 0) {
            return interaction.reply({ content: '❌ Tidak ada member lain di voice.', ephemeral: true });
        }
        const select = new UserSelectMenuBuilder()
            .setCustomId('vc_select_kick')
            .setPlaceholder('Pilih user untuk di-kick')
            .setMinValues(1)
            .setMaxValues(1);
        return interaction.reply({
            content: '👢 Pilih user yang mau di-kick:',
            components: [new ActionRowBuilder().addComponents(select)],
            ephemeral: true
        });
    }

    if (id === 'vc_claim') {
        if (interaction.user.id === data.ownerId) {
            return interaction.reply({ content: '❌ Kamu sudah owner.', ephemeral: true });
        }
        const owner = await interaction.guild.members.fetch(data.ownerId).catch(() => null);
        if (owner) {
            return interaction.reply({ content: '❌ Owner masih ada di server.', ephemeral: true });
        }
        data.ownerId = interaction.user.id;
        await vc.permissionOverwrites.edit(interaction.user.id, {
            Connect: true, ManageChannels: true, MoveMembers: true
        }).catch(() => {});
        await interaction.deferUpdate().catch(() => {});
        await updatePanel(interaction.client, data.channelId);
        return;
    }

    if (id === 'vc_confirm_delete') {
        // Batalkan empty timer kalau ada
        if (data.emptyTimer) { clearTimeout(data.emptyTimer); data.emptyTimer = null; }
        activeVoices.delete(data.channelId);
        try { await vc.delete('Owner delete private voice'); } catch {}
        await markPanelDeleted(interaction.client, data, '🗑️ Voice dihapus oleh owner.');
        return interaction.update({ content: '✅ Voice dihapus.', components: [] });
    }
    if (id === 'vc_cancel_delete') {
        return interaction.update({ content: '❌ Dibatalkan.', components: [] });
    }
}

// ==========================================
// MODAL HANDLER
// ==========================================
async function handleVoiceModal(interaction) {
    const voice = getVoiceByOwner(interaction.user.id);
    if (!voice) {
        return interaction.reply({ content: '❌ Kamu tidak punya voice aktif.', ephemeral: true });
    }
    const vc = await interaction.guild.channels.fetch(voice.channelId).catch(() => null);
    if (!vc) {
        activeVoices.delete(voice.channelId);
        await markPanelDeleted(interaction.client, voice, 'Voice sudah tidak ada.');
        return interaction.reply({ content: '❌ Voice sudah tidak ada.', ephemeral: true });
    }

    if (interaction.customId === 'vc_modal_rename') {
        const newName = interaction.fields.getTextInputValue('name');
        try { await vc.setName(newName, 'Owner rename private voice'); } catch (e) {
            return interaction.reply({ content: `❌ Gagal rename: ${e.message}`, ephemeral: true });
        }
        await interaction.reply({ content: `✅ Nama diubah ke **${newName}**`, ephemeral: true });
        await updatePanel(interaction.client, voice.channelId);
        return;
    }

    if (interaction.customId === 'vc_modal_limit') {
        const raw = interaction.fields.getTextInputValue('limit');
        const limit = parseInt(raw);
        if (isNaN(limit) || limit < 0 || limit > 99) {
            return interaction.reply({ content: '❌ Limit tidak valid (0-99).', ephemeral: true });
        }
        try { await vc.setUserLimit(limit, 'Owner set limit'); } catch (e) {
            return interaction.reply({ content: `❌ Gagal set limit: ${e.message}`, ephemeral: true });
        }
        voice.userLimit = limit;
        await interaction.reply({ content: `✅ Limit diubah ke **${limit === 0 ? '∞' : limit}**`, ephemeral: true });
        await updatePanel(interaction.client, voice.channelId);
        return;
    }
}

// ==========================================
// USER SELECT HANDLER
// ==========================================
async function handleVoiceSelect(interaction) {
    const voice = getVoiceByOwner(interaction.user.id);
    if (!voice) {
        return interaction.update({ content: '❌ Kamu tidak punya voice aktif.', components: [] });
    }
    const vc = await interaction.guild.channels.fetch(voice.channelId).catch(() => null);
    if (!vc) {
        activeVoices.delete(voice.channelId);
        await markPanelDeleted(interaction.client, voice, 'Voice sudah tidak ada.');
        return interaction.update({ content: '❌ Voice sudah tidak ada.', components: [] });
    }

    const selectedIds = interaction.values;

    if (interaction.customId === 'vc_select_invite') {
        let ok = 0, fail = 0;
        for (const id of selectedIds) {
            try {
                await vc.permissionOverwrites.edit(id, { Connect: true });
                ok++;
            } catch { fail++; }
        }
        return interaction.update({
            content: `✅ Invited: **${ok}**${fail > 0 ? ` • Gagal: **${fail}**` : ''}`,
            components: []
        });
    }

    if (interaction.customId === 'vc_select_kick') {
        const targetId = selectedIds[0];
        const target = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!target) return interaction.update({ content: '❌ User tidak ditemukan.', components: [] });
        if (!target.voice.channel || target.voice.channel.id !== voice.channelId) {
            return interaction.update({ content: '❌ User tidak di voice ini.', components: [] });
        }
        try {
            await target.voice.disconnect('Kicked dari private voice');
            return interaction.update({ content: `👢 **${target.user.username}** di-kick.`, components: [] });
        } catch (e) {
            return interaction.update({ content: `❌ Gagal: ${e.message}`, components: [] });
        }
    }
}

// ==========================================
// VOICE STATE UPDATE (auto-delete)
// ==========================================
async function handleVoiceStateUpdate(client, oldState, newState) {
    const channelId = oldState.channelId;
    if (!channelId) return;
    const data = activeVoices.get(channelId);
    if (!data) return;

    try {
        const vc = await client.channels.fetch(channelId).catch(() => null);
        if (!vc) {
            activeVoices.delete(channelId);
            return;
        }

        if (vc.members.size === 0) {
            if (data.emptyTimer) return;
            data.emptyTimer = setTimeout(async () => {
                try {
                    const ch = await client.channels.fetch(channelId).catch(() => null);
                    if (!ch) { activeVoices.delete(channelId); return; }
                    if (ch.members.size > 0) {
                        data.emptyTimer = null;
                        return;
                    }
                    activeVoices.delete(channelId);
                    await ch.delete('Private voice kosong, auto-delete').catch(() => {});
                    await markPanelDeleted(client, data, '🗑️ Voice otomatis dihapus (kosong).');
                    console.log(`🔊 [Voice] Auto-delete ${channelId} (kosong)`);
                } catch (e) { console.error('Voice auto-delete:', e.message); }
            }, 30 * 1000);
        } else {
            if (data.emptyTimer) {
                clearTimeout(data.emptyTimer);
                data.emptyTimer = null;
            }
        }
    } catch (e) { /* silent */ }
}

// ==========================================
// BARU — CHANNEL DELETE HANDLER
// ==========================================
async function handleChannelDelete(client, channel) {
    // Cek apakah channel yang dihapus adalah voice yang kita track
    const data = activeVoices.get(channel.id);
    if (!data) return;

    // Batalkan timer kalau ada
    if (data.emptyTimer) {
        clearTimeout(data.emptyTimer);
        data.emptyTimer = null;
    }

    // Hapus dari state
    activeVoices.delete(channel.id);

    // Update panel jadi "dihapus"
    await markPanelDeleted(
        client,
        data,
        `🗑️ Voice **${channel.name}** telah dihapus.\n> Panel ini tidak aktif lagi.`
    );

    console.log(`🔊 [Voice] Channel ${channel.name} (${channel.id}) dihapus manual — panel dibersihkan`);
}

module.exports = {
    VOICE_COMMANDS,
    handleVoiceInteraction,
    handleVoiceStateUpdate,
    handleChannelDelete
};