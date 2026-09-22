const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'growcord.sqlite'));
db.pragma('journal_mode = WAL');

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

console.log('✅ Database SQLite siap!');

function rowToUser(row) {
    if (!row) return null;
    return {
        userId: row.userId,
        username: row.username,
        level: row.level, xp: row.xp, maxXp: row.maxXp, skillPoints: row.skillPoints,
        gems: row.gems,
        blocks: { dirt: row.dirt, pog: row.pog },
        selectedBlock: row.selectedBlock,
        ownedTools: row.ownedTools ? row.ownedTools.split(',').filter(Boolean) : [],
        equippedTool: row.equippedTool || null,
        skills: {
            mining_speed: row.skill_mining_speed,
            gem_hunter: row.skill_gem_hunter,
            lucky_find: row.skill_lucky_find,
            xp_boost: row.skill_xp_boost,
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
    let converted = 0;
    while (ud.locks.wl >= 100) { ud.locks.wl -= 100; ud.locks.dl += 1; converted++; }
    while (ud.locks.dl >= 100) { ud.locks.dl -= 100; ud.locks.bgl += 1; converted++; }
    while (ud.locks.bgl >= 100) { ud.locks.bgl -= 100; ud.locks.bglb += 1; converted++; }
    return converted;
}

async function connectDB() { console.log('✅ Terhubung ke SQLite database!'); }

function getUser(userId, username) {
    let row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    if (!row) {
        db.prepare('INSERT INTO users (userId, username) VALUES (?, ?)').run(userId, username || 'Unknown');
        row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
        console.log(`👤 User baru terdaftar: ${username} (${userId})`);
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
            UPDATE users SET
                username = ?,
                level = ?, xp = ?, maxXp = ?, skillPoints = ?,
                gems = ?, dirt = ?, pog = ?, selectedBlock = ?,
                ownedTools = ?, equippedTool = ?,
                skill_mining_speed = ?, skill_gem_hunter = ?, skill_lucky_find = ?, skill_xp_boost = ?, skill_inventory_master = ?,
                item_arroz = ?, item_clover = ?, buff_arroz = ?, buff_clover = ?,
                lock_wl = ?, lock_dl = ?, lock_bgl = ?, lock_bglb = ?,
                autoFarm = ?, lastBreak = ?,
                event_name = ?, event_gemsMult = ?, event_blocksMult = ?
            WHERE userId = ?
        `).run(
            ud.username,
            ud.level, ud.xp, ud.maxXp, ud.skillPoints,
            Math.floor(ud.gems), ud.blocks.dirt, ud.blocks.pog, ud.selectedBlock,
            ud.ownedTools.join(','), ud.equippedTool,
            ud.skills.mining_speed, ud.skills.gem_hunter, ud.skills.lucky_find, ud.skills.xp_boost, ud.skills.inventory_master,
            ud.items.arroz, ud.items.clover, ud.activeBuffs.arroz, ud.activeBuffs.clover,
            ud.locks.wl, ud.locks.dl, ud.locks.bgl, ud.locks.bglb,
            ud.autoFarm ? 1 : 0, ud.lastBreak,
            ud.event.name, ud.event.gemsMult, ud.event.blocksMult,
            ud.userId
        );
    } catch (err) { console.error('❌ Gagal save user:', err.message); }
}

function getAllUsers() {
    const rows = db.prepare('SELECT * FROM users').all();
    return rows.map(rowToUser);
}

// ==========================================
// RESET PLAYER — hapus semua data user
// ==========================================
function resetUser(userId) {
    try {
        const exists = db.prepare('SELECT userId FROM users WHERE userId = ?').get(userId);
        if (!exists) return false;
        db.prepare('DELETE FROM users WHERE userId = ?').run(userId);
        return true;
    } catch (err) {
        console.error('❌ Gagal reset user:', err.message);
        return false;
    }
}

function getGuildConfig(guildId) {
    return db.prepare('SELECT * FROM guild_config WHERE guildId = ?').get(guildId) || null;
}
function setGuildConfig(guildId, panelChannelId, leaderboardChannelId) {
    db.prepare(`
        INSERT INTO guild_config (guildId, panelChannelId, leaderboardChannelId)
        VALUES (?, ?, ?)
        ON CONFLICT(guildId) DO UPDATE SET
            panelChannelId = excluded.panelChannelId,
            leaderboardChannelId = excluded.leaderboardChannelId
    `).run(guildId, panelChannelId, leaderboardChannelId);
}
function updateLeaderboardMessage(guildId, messageId) {
    db.prepare('UPDATE guild_config SET leaderboardMessageId = ? WHERE guildId = ?').run(messageId, guildId);
}
function getAllGuildConfigs() {
    return db.prepare('SELECT * FROM guild_config').all();
}
function removeGuildConfig(guildId) {
    db.prepare('DELETE FROM guild_config WHERE guildId = ?').run(guildId);
}

module.exports = {
    connectDB, getUser, saveUser, getAllUsers, resetUser,
    getGuildConfig, setGuildConfig, updateLeaderboardMessage, getAllGuildConfigs, removeGuildConfig
};