// Preview sementara untuk cek tampilan lock
const EMOJI = { wl: '[WL]', dl: '[DL]', bgl: '[BGL]', black: '[BGLB]' };
const ud = { locks: { wl: 1, dl: 0, bgl: 43, bglb: 38 } };

function getTotalLockValue(u) {
    return (u.locks.wl * 1) + (u.locks.dl * 100) + (u.locks.bgl * 10000) + (u.locks.bglb * 1000000);
}
function formatWL(v) {
    if (v === 0) return '0';
    if (v < 1) return v.toFixed(2);
    if (v === Math.floor(v)) return v.toLocaleString();
    return v.toFixed(2);
}
const LOCK_INFO = {
    wl:   { name: 'WL',   emoji: EMOJI.wl,    worth: 1 },
    dl:   { name: 'DL',   emoji: EMOJI.dl,    worth: 100 },
    bgl:  { name: 'BGL',  emoji: EMOJI.bgl,   worth: 10000 },
    bglb: { name: 'BGLB', emoji: EMOJI.black, worth: 1000000 }
};
function lockSummary(u) {
    return Object.keys(LOCK_INFO).map(k => `${LOCK_INFO[k].emoji} ${formatWL(u.locks[k] || 0)}`).join(' · ');
}
function lockDetail(u) {
    const lines = Object.entries(LOCK_INFO).map(([k, i]) => {
        const amount = u.locks[k] || 0;
        return `${i.emoji} **${i.name}** ×${formatWL(amount)}  ·  ${EMOJI.wl} = **${formatWL(amount * i.worth)} WL**`;
    });
    return lines.join('\n') +
        `\n\n> 🔄 **Auto-convert:** 100 ${EMOJI.wl} → 1 ${EMOJI.dl} → 1 ${EMOJI.bgl} → 1 ${EMOJI.black}` +
        `\n> 🛒 Saat belanja, lock otomatis terpakai dari yang **paling besar** dulu.` +
        `\n> ${EMOJI.wl} **Total: ${formatWL(getTotalLockValue(u))} WL**`;
}

console.log('=== FIELD: [WL] Total WL (inline) ===');
console.log(`**${formatWL(getTotalLockValue(ud))}**\n> ${lockSummary(ud)}`);

console.log('\n=== FIELD: 🔒 Lock & Konversi (full width) ===');
console.log(lockDetail(ud));

console.log('\n=== FOOTER: Profile ===');
console.log('Total WL = WL×1 + DL×100 + BGL×10.000 + BGLB×1.000.000');

console.log('\n=== FOOTER: Shop ===');
console.log(`Gems: 35.921.879 • 1 ${EMOJI.dl} = 100 ${EMOJI.wl} • 1 ${EMOJI.bgl} = 10.000 ${EMOJI.wl} • 1 ${EMOJI.black} = 1.000.000 ${EMOJI.wl}`);

console.log('\n=== Cek manual: 38 BGLB + 43 BGL + 0 DL + 1 WL =', formatWL(getTotalLockValue(ud)), 'WL');

console.log('\n=== Kasus user baru (semula 0) ===');
const n = { locks: { wl: 0, dl: 0, bgl: 0, bglb: 0 } };
console.log(lockSummary(n), '=>', formatWL(getTotalLockValue(n)), 'WL');
console.log(lockDetail(n));
