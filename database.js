const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'growcord.sqlite'));
db.pragma('journal_mode = WAL');

// Users (farming)
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT DEFAULT 'Unknown',
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        maxXp INTEGER DEFAULT 1000,
        skillPoints INTEGER DEFAULT 0,
        gems INTEGER DEFAULT 500000,
        dirt INTEGER DEFAULT 500,
        pog INTEGER DEFAULT 0,
        selectedBlock TEXT DEFAULT 'dirt',
        ownedTools TEXT DEFAULT '',
        equippedTool TEXT DEFAULT NULL,
        skill_mining_speed INTEGER DEFAULT 0,
        skill_gem_hunter INTEGER DEFAULT 0,
        skill_lucky_find INTEGER DEFAULT 0,
        skill_xp_boost INTEGER DEFAULT 0,
        skill_inventory_master INTEGER DEFAULT 0,
        item_arroz INTEGER DEFAULT 0,
        item_clover INTEGER DEFAULT 0,
        buff_arroz INTEGER DEFAULT 0,
        buff_clover INTEGER DEFAULT 0,
        lock_wl INTEGER DEFAULT 1,
        lock_dl INTEGER DEFAULT 0,
        lock_bgl INTEGER DEFAULT 0,
        lock_bglb INTEGER DEFAULT 0,
        autoFarm INTEGER DEFAULT 0,
        lastBreak TEXT DEFAULT 'Auto Farm belum dinyalakan.',
        event_name TEXT DEFAULT 'Tidak Ada Event',
        event_gemsMult INTEGER DEFAULT 1,
        event_blocksMult INTEGER DEFAULT 1
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
        guildId TEXT PRIMARY KEY,
        panelChannelId TEXT,
        leaderboardChannelId TEXT,
        leaderboardMessageId TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS welcome_config (
        guildId TEXT PRIMARY KEY,
        channelId TEXT,
        message TEXT DEFAULT 'Welcome {user} ke **{server}**! 🎉',
        enabled INTEGER DEFAULT 0,
        embedColor TEXT DEFAULT '#57F287'
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS autorole_config (
        guildId TEXT PRIMARY KEY,
        roleId TEXT,
        enabled INTEGER DEFAULT 0
    )
`);

// ==========================================
// 🛡️ WARNS
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS warns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guildId TEXT,
        userId TEXT,
        modId TEXT,
        reason TEXT,
        timestamp INTEGER
    )
`);

// ==========================================
// 🏷️ TAGS
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
        guildId TEXT,
        name TEXT,
        content TEXT,
        authorId TEXT,
        uses INTEGER DEFAULT 0,
        createdAt INTEGER,
        PRIMARY KEY (guildId, name)
    )
`);

// ==========================================
// 🎭 REACTION ROLES
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS reaction_roles (
        messageId TEXT,
        guildId TEXT,
        channelId TEXT,
        emoji TEXT,
        roleId TEXT,
        PRIMARY KEY (messageId, emoji)
    )
`);

// ==========================================
// 📜 LOGGING
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS logging_config (
        guildId TEXT PRIMARY KEY,
        channelId TEXT,
        logMessages INTEGER DEFAULT 1,
        logMembers INTEGER DEFAULT 1,
        logMod INTEGER DEFAULT 1,
        logVoice INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 0
    )
`);

// ==========================================
// ⭐ STARBOARD
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS starboard_config (
        guildId TEXT PRIMARY KEY,
        channelId TEXT,
        emoji TEXT DEFAULT '⭐',
        threshold INTEGER DEFAULT 3,
        enabled INTEGER DEFAULT 0,
        ignoreChannels TEXT DEFAULT ''
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS starboard_messages (
        originalMessageId TEXT PRIMARY KEY,
        starboardMessageId TEXT,
        guildId TEXT,
        starCount INTEGER DEFAULT 0
    )
`);

// ==========================================
// 🚨 AUTOMOD
// ==========================================
db.exec(`
    CREATE TABLE IF NOT EXISTS automod_config (
        guildId TEXT PRIMARY KEY,
        enabled INTEGER DEFAULT 0,
        antiLink INTEGER DEFAULT 0,
        antiInvite INTEGER DEFAULT 1,
        antiSpam INTEGER DEFAULT 1,
        antiCaps INTEGER DEFAULT 0,
        badWords TEXT DEFAULT '',
        logChannelId TEXT,
        exemptChannels TEXT DEFAULT '',
        exemptRoles TEXT DEFAULT ''
    )
`);

console.log('✅ Database SQLite siap!');

// ==========================================
// USER (FARMING)
// ==========================================
function rowToUser(row) {
    if (!row) return null;
    return {
        userId: row.userId, username: row.username,
        level: row.level, xp: row.xp, maxXp: row.maxXp, skillPoints: row.skillPoints,
        gems: row.gems,
        blocks: { dirt: row.dirt, pog: row.pog },
        selectedBlock: row.selectedBlock,
        ownedTools: row.ownedTools ? row.ownedTools.split(',').filter(Boolean) : [],
        equippedTool: row.equippedTool || null,
        skills: {
            mining_speed: row.skill_mining_speed, gem_hunter: row.skill_gem_hunter,
            lucky_find: row.skill_lucky_find, xp_boost: row.skill_xp_boost,
            inventory_master: row.skill_inventory_master
        },
        items: { arroz: row.item_arroz, clover: row.item_clover },
        activeBuffs: { arroz: row.buff_arroz, clover: row.buff_clover },
        locks: { wl: row.lock_wl, dl: row.lock_dl, bgl: row.lock_bgl, bglb: row.lock_bglb },
        autoFarm: row.autoFarm === 1,
        lastBreak: row.lastBreak,
        currentView: 'main',
        event: { name: row.event_name, gemsMult: row.event_gemsMult, blocksMult: row.event_blocksMult }
    };
}

function autoConvertLocks(ud) {
    while (ud.locks.wl >= 100) { ud.locks.wl -= 100; ud.locks.dl += 1; }
    while (ud.locks.dl >= 100) { ud.locks.dl -= 100; ud.locks.bgl += 1; }
    while (ud.locks.bgl >= 100) { ud.locks.bgl -= 100; ud.locks.bglb += 1; }
}

async function connectDB() { console.log('✅ Terhubung ke SQLite database!'); }

function getUser(userId, username) {
    let row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    if (!row) {
        db.prepare('INSERT INTO users (userId, username) VALUES (?, ?)').run(userId, username || 'Unknown');
        row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    } else if (username && row.username !== username) {
        db.prepare('UPDATE users SET username = ? WHERE userId = ?').run(username, userId);
        row.username = username;
    }
    return rowToUser(row);
}

function saveUser(ud) {
    try {
        autoConvertLocks(ud);
        db.prepare(`
            UPDATE users SET username = ?, level = ?, xp = ?, maxXp = ?, skillPoints = ?,
                gems = ?, dirt = ?, pog = ?, selectedBlock = ?, ownedTools = ?, equippedTool = ?,
                skill_mining_speed = ?, skill_gem_hunter = ?, skill_lucky_find = ?, skill_xp_boost = ?, skill_inventory_master = ?,
                item_arroz = ?, item_clover = ?, buff_arroz = ?, buff_clover = ?,
                lock_wl = ?, lock_dl = ?, lock_bgl = ?, lock_bglb = ?,
                autoFarm = ?, lastBreak = ?, event_name = ?, event_gemsMult = ?, event_blocksMult = ?
            WHERE userId = ?
        `).run(
            ud.username, ud.level, ud.xp, ud.maxXp, ud.skillPoints,
            Math.floor(ud.gems), ud.blocks.dirt, ud.blocks.pog, ud.selectedBlock,
            ud.ownedTools.join(','), ud.equippedTool,
            ud.skills.mining_speed, ud.skills.gem_hunter, ud.skills.lucky_find, ud.skills.xp_boost, ud.skills.inventory_master,
            ud.items.arroz, ud.items.clover, ud.activeBuffs.arroz, ud.activeBuffs.clover,
            ud.locks.wl, ud.locks.dl, ud.locks.bgl, ud.locks.bglb,
            ud.autoFarm ? 1 : 0, ud.lastBreak, ud.event.name, ud.event.gemsMult, ud.event.blocksMult, ud.userId
        );
    } catch (err) { console.error('❌ Gagal save user:', err.message); }
}

function getAllUsers() { return db.prepare('SELECT * FROM users').all().map(rowToUser); }
function resetUser(userId) {
    const e = db.prepare('SELECT userId FROM users WHERE userId = ?').get(userId);
    if (!e) return false;
    db.prepare('DELETE FROM users WHERE userId = ?').run(userId);
    return true;
}

function getGuildConfig(g) { return db.prepare('SELECT * FROM guild_config WHERE guildId = ?').get(g) || null; }
function setGuildConfig(g, p, l) {
    db.prepare(`INSERT INTO guild_config (guildId, panelChannelId, leaderboardChannelId) VALUES (?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET panelChannelId = excluded.panelChannelId, leaderboardChannelId = excluded.leaderboardChannelId`).run(g, p, l);
}
function updateLeaderboardMessage(g, m) { db.prepare('UPDATE guild_config SET leaderboardMessageId = ? WHERE guildId = ?').run(m, g); }
function getAllGuildConfigs() { return db.prepare('SELECT * FROM guild_config').all(); }
function removeGuildConfig(g) { db.prepare('DELETE FROM guild_config WHERE guildId = ?').run(g); }

function getWelcomeConfig(g) { return db.prepare('SELECT * FROM welcome_config WHERE guildId = ?').get(g) || null; }
function setWelcomeConfig(g, d) {
    db.prepare(`INSERT INTO welcome_config (guildId, channelId, message, enabled, embedColor) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, message = excluded.message, enabled = excluded.enabled, embedColor = excluded.embedColor`)
        .run(g, d.channelId || null, d.message || 'Welcome {user}', d.enabled ? 1 : 0, d.embedColor || '#57F287');
}

function getAutoRoleConfig(g) { return db.prepare('SELECT * FROM autorole_config WHERE guildId = ?').get(g) || null; }
function setAutoRoleConfig(g, r, e) {
    db.prepare(`INSERT INTO autorole_config (guildId, roleId, enabled) VALUES (?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET roleId = excluded.roleId, enabled = excluded.enabled`).run(g, r, e ? 1 : 0);
}
function removeAutoRoleConfig(g) { db.prepare('DELETE FROM autorole_config WHERE guildId = ?').run(g); }

// WARNS
function addWarn(g, u, m, r) {
    const res = db.prepare('INSERT INTO warns (guildId, userId, modId, reason, timestamp) VALUES (?, ?, ?, ?, ?)').run(g, u, m, r, Date.now());
    return res.lastInsertRowid;
}
function getWarns(g, u) { return db.prepare('SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC').all(g, u); }
function getAllWarns(g) { return db.prepare('SELECT * FROM warns WHERE guildId = ? ORDER BY timestamp DESC').all(g); }
function removeWarn(id) { db.prepare('DELETE FROM warns WHERE id = ?').run(id); }
function clearWarns(g, u) { db.prepare('DELETE FROM warns WHERE guildId = ? AND userId = ?').run(g, u); }

// TAGS
function createTag(g, name, content, authorId) {
    try {
        db.prepare('INSERT INTO tags (guildId, name, content, authorId, createdAt) VALUES (?, ?, ?, ?, ?)').run(g, name.toLowerCase(), content, authorId, Date.now());
        return true;
    } catch (e) { return false; }
}
function getTag(g, name) { return db.prepare('SELECT * FROM tags WHERE guildId = ? AND name = ?').get(g, name.toLowerCase()) || null; }
function deleteTag(g, name) { db.prepare('DELETE FROM tags WHERE guildId = ? AND name = ?').run(g, name.toLowerCase()); }
function listTags(g) { return db.prepare('SELECT * FROM tags WHERE guildId = ? ORDER BY name ASC').all(g); }
function incrementTagUse(g, name) { db.prepare('UPDATE tags SET uses = uses + 1 WHERE guildId = ? AND name = ?').run(g, name.toLowerCase()); }

// REACTION ROLES
function addReactionRole(messageId, guildId, channelId, emoji, roleId) {
    db.prepare(`INSERT INTO reaction_roles (messageId, guildId, channelId, emoji, roleId) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(messageId, emoji) DO UPDATE SET roleId = excluded.roleId`).run(messageId, guildId, channelId, emoji, roleId);
}
function removeReactionRole(messageId, emoji) { db.prepare('DELETE FROM reaction_roles WHERE messageId = ? AND emoji = ?').run(messageId, emoji); }
function getReactionRolesForMessage(messageId) { return db.prepare('SELECT * FROM reaction_roles WHERE messageId = ?').all(messageId); }
function getReactionRole(messageId, emoji) { return db.prepare('SELECT * FROM reaction_roles WHERE messageId = ? AND emoji = ?').get(messageId, emoji) || null; }
function listReactionRoles(g) { return db.prepare('SELECT * FROM reaction_roles WHERE guildId = ?').all(g); }

// LOGGING
function getLoggingConfig(g) {
    let c = db.prepare('SELECT * FROM logging_config WHERE guildId = ?').get(g);
    if (!c) {
        db.prepare('INSERT INTO logging_config (guildId) VALUES (?)').run(g);
        c = db.prepare('SELECT * FROM logging_config WHERE guildId = ?').get(g);
    }
    return c;
}
function setLoggingConfig(g, d) {
    db.prepare(`INSERT INTO logging_config (guildId, channelId, logMessages, logMembers, logMod, logVoice, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, logMessages = excluded.logMessages,
        logMembers = excluded.logMembers, logMod = excluded.logMod, logVoice = excluded.logVoice, enabled = excluded.enabled`)
        .run(g, d.channelId || null, d.logMessages ? 1 : 0, d.logMembers ? 1 : 0, d.logMod ? 1 : 0, d.logVoice ? 1 : 0, d.enabled ? 1 : 0);
}

// STARBOARD
function getStarboardConfig(g) {
    let c = db.prepare('SELECT * FROM starboard_config WHERE guildId = ?').get(g);
    if (!c) {
        db.prepare('INSERT INTO starboard_config (guildId) VALUES (?)').run(g);
        c = db.prepare('SELECT * FROM starboard_config WHERE guildId = ?').get(g);
    }
    return c;
}
function setStarboardConfig(g, d) {
    db.prepare(`INSERT INTO starboard_config (guildId, channelId, emoji, threshold, enabled, ignoreChannels)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET channelId = excluded.channelId, emoji = excluded.emoji, threshold = excluded.threshold,
        enabled = excluded.enabled, ignoreChannels = excluded.ignoreChannels`)
        .run(g, d.channelId || null, d.emoji || '⭐', d.threshold || 3, d.enabled ? 1 : 0, d.ignoreChannels || '');
}
function getStarboardMessage(msgId) { return db.prepare('SELECT * FROM starboard_messages WHERE originalMessageId = ?').get(msgId) || null; }
function saveStarboardMessage(origId, sbId, guildId, count) {
    db.prepare(`INSERT INTO starboard_messages (originalMessageId, starboardMessageId, guildId, starCount) VALUES (?, ?, ?, ?)
        ON CONFLICT(originalMessageId) DO UPDATE SET starboardMessageId = excluded.starboardMessageId, starCount = excluded.starCount`)
        .run(origId, sbId, guildId, count);
}
function updateStarCount(origId, count) { db.prepare('UPDATE starboard_messages SET starCount = ? WHERE originalMessageId = ?').run(count, origId); }
function deleteStarboardMessage(origId) { db.prepare('DELETE FROM starboard_messages WHERE originalMessageId = ?').run(origId); }

// AUTOMOD
function getAutomodConfig(g) {
    let c = db.prepare('SELECT * FROM automod_config WHERE guildId = ?').get(g);
    if (!c) {
        db.prepare('INSERT INTO automod_config (guildId) VALUES (?)').run(g);
        c = db.prepare('SELECT * FROM automod_config WHERE guildId = ?').get(g);
    }
    return c;
}
function setAutomodConfig(g, d) {
    db.prepare(`INSERT INTO automod_config (guildId, enabled, antiLink, antiInvite, antiSpam, antiCaps, badWords, logChannelId, exemptChannels, exemptRoles)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET enabled = excluded.enabled, antiLink = excluded.antiLink, antiInvite = excluded.antiInvite,
        antiSpam = excluded.antiSpam, antiCaps = excluded.antiCaps, badWords = excluded.badWords,
        logChannelId = excluded.logChannelId, exemptChannels = excluded.exemptChannels, exemptRoles = excluded.exemptRoles`)
        .run(g, d.enabled ? 1 : 0, d.antiLink ? 1 : 0, d.antiInvite ? 1 : 0, d.antiSpam ? 1 : 0, d.antiCaps ? 1 : 0,
            d.badWords || '', d.logChannelId || null, d.exemptChannels || '', d.exemptRoles || '');
}

module.exports = {
    connectDB, getUser, saveUser, getAllUsers, resetUser,
    getGuildConfig, setGuildConfig, updateLeaderboardMessage, getAllGuildConfigs, removeGuildConfig,
    getWelcomeConfig, setWelcomeConfig,
    getAutoRoleConfig, setAutoRoleConfig, removeAutoRoleConfig,
    addWarn, getWarns, getAllWarns, removeWarn, clearWarns,
    createTag, getTag, deleteTag, listTags, incrementTagUse,
    addReactionRole, removeReactionRole, getReactionRolesForMessage, getReactionRole, listReactionRoles,
    getLoggingConfig, setLoggingConfig,
    getStarboardConfig, setStarboardConfig, getStarboardMessage, saveStarboardMessage, updateStarCount, deleteStarboardMessage,
    getAutomodConfig, setAutomodConfig
};