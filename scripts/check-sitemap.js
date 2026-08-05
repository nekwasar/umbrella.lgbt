const fs = require('fs');

const config = JSON.parse(fs.readFileSync('content.json', 'utf8'));
const sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
const seeded = config.pages.filter(p => p.seeded);
const missing = seeded.filter(p => {
  const url = p.type === 'core'
    ? 'https://umbrella.lgbt/' + p.slug
    : 'https://umbrella.lgbt/' + p.type + '/' + p.slug;
  return !sitemap.includes(url);
});

if (missing.length > 0) {
  console.error('Seeded pages missing from sitemap:', missing.map(p => p.type + '/' + p.slug));
  process.exit(1);
}
console.log('Sitemap contains all ' + seeded.length + ' seeded pages ✓');
