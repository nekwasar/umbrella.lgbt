const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync('content.json', 'utf8'));
const pages = config.pages;

const byType = {};
for (const p of pages) {
  if (!byType[p.type]) byType[p.type] = { seeded: 0, total: 0, unseeded: [] };
  byType[p.type].total++;
  if (p.seeded) byType[p.type].seeded++;
  else byType[p.type].unseeded.push(p.slug);
}

console.log('SEEDING STATUS');
console.log('==============');
for (const [type, info] of Object.entries(byType)) {
  const pct = Math.round((info.seeded / info.total) * 100);
  console.log(`\n${type}: ${info.seeded}/${info.total} seeded (${pct}%)`);
  if (info.unseeded.length > 0) {
    console.log(`  next to seed: ${info.unseeded.slice(0, 5).join(', ')}`);
  }
}

const total = pages.length;
const seeded = pages.filter(p => p.seeded).length;
console.log(`\nTOTAL: ${seeded}/${total} (${Math.round((seeded / total) * 100)}%)`);
