const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'growexs.db');
const db = new Database(dbPath, { readonly: true });

console.log('📂 Database:', dbPath);
console.log('');

// List semua tabel
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('📋 Tabel yang ada:');
tables.forEach(t => console.log(`   - ${t.name}`));
console.log('');

// Jumlah user
try {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    console.log(`👥 Total user: ${count.c}`);
} catch (e) { console.log('⚠️ Tidak ada tabel users'); }

// Sample 10 user pertama
try {
    const users = db.prepare('SELECT userId, username, level, gems FROM users LIMIT 10').all();
    console.log('');
    console.log('📋 Sample user (10 pertama):');
    users.forEach(u => {
        console.log(`   @${u.username} — Lv.${u.level}, ${Math.floor(u.gems).toLocaleString()} gems (ID: ${u.userId})`);
    });
} catch (e) { console.log('⚠️ Gagal baca user:', e.message); }

// Cek tabel lain
console.log('');
console.log('📊 Data tabel lain:');
tables.forEach(t => {
    if (t.name === 'sqlite_sequence') return;
    try {
        const c = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get();
        console.log(`   ${t.name}: ${c.c} baris`);
    } catch (e) {}
});

db.close();