const fs = require('fs');
const path = require('path');

const publicDir = 'public';
const errors = [];
let checked = 0;

function resolveTarget(href) {
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) return null;
  if (href.startsWith('#') || href.startsWith('tel:')) return null;
  let url = href;
  const queryIdx = url.indexOf('?');
  if (queryIdx > -1) url = url.substring(0, queryIdx);
  const hashIdx = url.indexOf('#');
  if (hashIdx > -1) url = url.substring(0, hashIdx);
  if (!url.startsWith('/')) return null;
  let target = path.join(publicDir, url);
  const candidates = [
    target,
    path.join(publicDir, url, 'index.html'),
    target + '.html'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return null;
  }
  return candidates[0];
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
      for (const href of hrefs) {
        checked++;
        const broken = resolveTarget(href);
        if (broken) {
          errors.push(`${full.replace(publicDir + path.sep, '')}: '${href}' -> missing ${broken}`);
        }
      }
    }
  }
}

walk(publicDir);

if (errors.length > 0) {
  console.error(`\nBROKEN LINKS (${errors.length}):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`Link check passed: ${checked} internal links, 0 broken.`);
