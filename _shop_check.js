// Temporary diagnostic: render shop views and validate against Discord API limits.
const fs = require('fs');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const src = fs.readFileSync('index.js', 'utf8').split('\n');
const slice = (a, b) => src.slice(a - 1, b).join('\n');

const code = [
  slice(45, 256),   // EMOJI + SHOP_TOOLS + BLOCKS + SHOP_ITEMS + SHOP_LOCKS + SKILLS
  slice(326, 479),  // helpers (getTotalBlocks, getTotalLockValue, formatWL, formatStock, formatBlockPrice)
  slice(785, 1027), // shop embeds + shop buttons
].join('\n');

const factory = new Function(
  'EmbedBuilder', 'ActionRowBuilder', 'ButtonBuilder', 'ButtonStyle',
  code + '\nreturn { shopMainEmbed, shopToolsEmbed, shopBlocksEmbed, shopItemsEmbed, shopLocksEmbed, shopMainButtons, shopToolsButtons, shopBlocksButtons, shopItemsButtons, shopLocksButtons, changeBlockEmbed, changeBlockButtons, formatWL, getTotalLockValue, spendWL, getTotalWL, SHOP_BLOCKS, BLOCKS_LOW, BLOCK_POG, BLOCKS_HIGH };'
);

const api = factory(EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle);

const ud = {
  gems: 123456789, level: 42, xp: 0, maxXp: 1, skillPoints: 3,
  blocks: {}, ownedTools: ['lss'], equippedTool: 'lss', selectedBlock: 'dirt',
  skills: { mining_speed: 3, gem_hunter: 2, lucky_find: 1, xp_boost: 0, inventory_master: 0 },
  locks: { wl: 1234.5, dl: 3, bgl: 43, bglb: 0 },
  items: { arroz: 2, gempack: 1, gbc: 5 }, activeBuffs: {},
};
for (const k in api.SHOP_BLOCKS) ud.blocks[k] = 0;
ud.blocks.sand = 5000;
ud.blocks.diamond = 12;

function report(name, embed, rows) {
  const data = embed.toJSON();
  const issues = [];
  const title = data.title || '';
  if (title.length > 256) issues.push(`title ${title.length} > 256`);
  const desc = data.description || '';
  if (desc.length > 4096) issues.push(`description ${desc.length} > 4096`);
  if ((data.footer?.text || '').length > 2048) issues.push(`footer ${data.footer.text.length} > 2048`);
  for (const f of data.fields || []) {
    if (f.name.length > 256) issues.push(`field name ${f.name.length} > 256`);
    if ((f.value || '').length > 1024) issues.push(`field "${f.name}" value ${f.value.length} > 1024`);
  }
  if (rows) {
    if (rows.length > 5) issues.push(`${rows.length} action rows > 5`);
    rows.forEach((r, i) => {
      const json = r.toJSON();
      if (json.components.length > 5) issues.push(`row ${i} has ${json.components.length} buttons > 5`);
      json.components.forEach(c => {
        if ((c.label || '').length > 80) issues.push(`row ${i} label "${c.label}" ${c.label.length} > 80`);
        if ((c.custom_id || '').length > 100) issues.push(`row ${i} customId > 100`);
      });
    });
  }
  console.log(`\n===== ${name} =====`);
  console.log(`title=${title.length} desc=${desc.length} fields=${(data.fields||[]).length} rows=${rows?rows.length:'-'}`);
  if (issues.length) { console.log('!! ISSUES:'); issues.forEach(x => console.log('   - ' + x)); }
  else console.log('OK (within limits)');
  return { data, desc, issues };
}

report('SHOP MAIN', api.shopMainEmbed(ud), api.shopMainButtons());
report('SHOP TOOLS', api.shopToolsEmbed(ud), api.shopToolsButtons());
for (const p of ['low', 'pog', 'high']) report(`SHOP BLOCKS [${p}]`, api.shopBlocksEmbed(ud, p), api.shopBlocksButtons(ud, p));
report('SHOP ITEMS', api.shopItemsEmbed(ud), api.shopItemsButtons());
report('SHOP LOCKS', api.shopLocksEmbed(ud), api.shopLocksButtons());
for (const p of ['low', 'pog', 'high']) report(`CHANGE BLOCK [${p}]`, api.changeBlockEmbed(ud, p), api.changeBlockButtons(ud, p));

console.log('\n===== SPEND WL CHECK =====');
for (const amt of [1234.5, 100, 500, 10300, 250000.25]) {
  const t = { locks: { ...ud.locks } };
  const ok = api.spendWL(t, amt);
  console.log(`spend ${amt} -> ok=${ok} locks=${JSON.stringify(t.locks)} totalWL=${api.getTotalWL(t)} (before ${api.getTotalWL(ud)})`);
}

console.log('\n===== BLOCK PRICE LABELS =====');
for (const k in api.SHOP_BLOCKS) {
  const b = api.SHOP_BLOCKS[k];
  console.log(`${k.padEnd(10)} blockPerWL=${String(b.blockPerWL).padEnd(7)} label=1 WL = ${b.blockPerWL >= 1 ? b.blockPerWL : 1 / b.blockPerWL} block`);
}
