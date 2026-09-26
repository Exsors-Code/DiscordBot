// Read-only diagnostic: cek guild yg Accessible & apakah custom emoji bisa di-resolve.
require('dotenv').config();
const { REST, Routes } = require('discord.js');

const EMOJI = {
    lray: '1552901313992335390', ancesred: '1552900692895600640', bgl: '1552900717780406303',
    black: '1552900737221263500', dirt: '1552900796763602985', dl: '1552900827130372168',
    fist: '1552900846725898282', gang: '1552900891651215430', gbc: '1552901254177497179',
    gems: '1552901284443455528', pog: '1552901365704032256', mray: '1552901340005670932',
    rayman: '1552901389120704623', wl: '1552901434834550824', gray: '1552905480815378552'
};

(async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const me = await rest.get(Routes.currentApplication());
    console.log(`Bot: ${me.name}#${me.tag} (${me.id})\n`);

    const guilds = await rest.get(Routes.oauth2CurrentUserGuilds());
    console.log(`Guild accessible: ${guilds.length}\n`);

    const found = {};
    for (const g of guilds) {
        const emojis = await rest.get(Routes.guildEmojis(g.id));
        for (const e of emojis) if (!found[e.id]) found[e.id] = { name: e.name, guild: `${g.name} (${g.id})` };
        console.log(`  - ${g.name} (${g.id}): ${emojis.length} emoji`);
    }

    console.log('\n=== HASIL PENCOCOKAN ===');
    let ok = 0, miss = 0;
    for (const [key, id] of Object.entries(EMOJI)) {
        if (found[id]) { console.log(`  OK    ${key.padEnd(9)} -> :${found[id].name}: di ${found[id].guild}`); ok++; }
        else { console.log(`  MISS  ${key.padEnd(9)} -> id ${id} TIDAK ADA di guild accessible mana pun`); miss++; }
    }
    console.log(`\nResolvable: ${ok} | Tidak resolve: ${miss}`);
    if (miss > 0) console.log('=> Emoji ini akan muncul sebagai TEKS MENTAH <:nama:id> di Discord.');
})().catch(e => { console.error('Gagal:', e.message); process.exit(1); });
