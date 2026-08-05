const fs = require('fs');
const path = require('path');
const marked = require('marked');

const config = JSON.parse(fs.readFileSync('content.json', 'utf8'));
const site = config.site;

const X_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;

function render(template, vars) {
  let result = template;

  result = result.replace(/\{\{#seeded\}\}([\s\S]*?)\{\{\/seeded\}\}/g, (_, content) => {
    return vars._seeded ? content : '';
  });

  result = result.replace(/\{\{\^seeded\}\}([\s\S]*?)\{\{\/seeded\}\}/g, (_, content) => {
    return !vars._seeded ? content : '';
  });

  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === 'string' || typeof value === 'number') {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  }

  return result;
}

function mdToHTML(md, options) {
  const html = marked.parse(md);
  if (options && options.stripFirstH1) {
    return html.replace(/<h1[^>]*>.*?<\/h1>\s*/s, '');
  }
  return html;
}

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractMetaDescription(md, page, maxLen) {
  maxLen = maxLen || 155;
  if (!md) {
    return page.title + ' — coming soon on Umbrella.lgbt, the everything queer app.';
  }
  const html = marked.parse(md);
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  let desc = text.split('. ')
    .map(s => s.trim())
    .filter(s => s.length > 25 && !s.match(/^(Short Answer|Definition)$/))
    .find(s => !s.match(/^(##|#|Short Answer)/));
  if (!desc) desc = text.substring(0, maxLen);
  if (desc && !desc.endsWith('.')) desc += '.';
  if (desc.length > maxLen) {
    desc = desc.substring(0, desc.lastIndexOf('.', maxLen) + 1 || maxLen);
  }
  return desc;
}

function fullTitle(page) {
  if (page.slug === 'index') return site.name + ' — ' + site.tagline;
  return page.title + ' | Umbrella.lgbt';
}

function indexFullTitle(label) {
  return label + ' | Umbrella.lgbt';
}

function stripFirstH1(html) {
  return html.replace(/<h1[^>]*>.*?<\/h1>\s*/s, '');
}

function findRelated(page, pages, type, count) {
  return pages.filter(p => p.type === type && p.seeded && p.slug !== page.slug).slice(0, count);
}

function findCrossTypeLinks(page, pages, types, count) {
  const results = [];
  for (const t of types) {
    const found = pages.filter(p => p.type === t && p.seeded).slice(0, count);
    results.push(...found);
    if (results.length >= count) break;
  }
  return results.slice(0, count);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function pageOutputPath(page) {
  if (page.type === 'core') return `public/${page.slug}.html`;
  return `public/${page.type}/${page.slug}.html`;
}

function pageURL(page) {
  if (page.type === 'core') return `/${page.slug}`;
  return `/${page.type}/${page.slug}`;
}

const pages = config.pages.map(p => ({ ...p }));

const baseTemplate = fs.readFileSync('templates/base.html', 'utf8');
const homeTemplate = fs.readFileSync('templates/home.html', 'utf8');
const pageTemplate = fs.readFileSync('templates/page.html', 'utf8');
const qaTemplate = fs.readFileSync('templates/qa.html', 'utf8');
const glossaryTemplate = fs.readFileSync('templates/glossary.html', 'utf8');
const cityTemplate = fs.readFileSync('templates/city.html', 'utf8');
const resourceTemplate = fs.readFileSync('templates/resource.html', 'utf8');
const blogTemplate = fs.readFileSync('templates/blog.html', 'utf8');

const templateMap = {
  core: pageTemplate,
  qa: qaTemplate,
  glossary: glossaryTemplate,
  city: cityTemplate,
  resources: resourceTemplate,
  blog: blogTemplate
};

function getTemplate(page) {
  return templateMap[page.type] || pageTemplate;
}

function breadcrumbParts(page) {
  const parts = [
    { label: site.name, url: site.url }
  ];
  if (page.type !== 'core') {
    const typeLabels = { qa: 'Q&A', glossary: 'Glossary', city: 'City Guides', resources: 'Resources', blog: 'Blog' };
    parts.push({ label: typeLabels[page.type] || page.type, url: `${site.url}/${page.type}` });
  }
  if (page.type !== 'core') {
    parts.push({ label: page.title, url: `${site.url}${pageURL(page)}` });
  } else if (page.slug !== 'index') {
    parts.push({ label: page.title, url: `${site.url}${pageURL(page)}` });
  }
  return parts;
}

function breadcrumbsHTML(page) {
  const parts = breadcrumbParts(page);
  let html = '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>';
  for (let i = 0; i < parts.length; i++) {
    if (i === parts.length - 1) {
      html += `<li aria-current="page">${parts[i].label}</li>`;
    } else {
      html += `<li><a href="${parts[i].url}">${parts[i].label}</a></li>`;
    }
  }
  html += '</ol></nav>';
  return html;
}

function jsonLD(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

function schemaOrganization() {
  return jsonLD({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": site.name,
    "url": site.url,
    "description": site.tagline + '. ' + site.subtagline + '. A platform built by and for the LGBTQ+ community.',
    "email": site.contact,
    "sameAs": [
      `https://x.com/${site.socials.x}`
    ]
  });
}

function schemaWebSite(url) {
  return jsonLD({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": site.name,
    "url": site.url,
    "description": site.tagline + '. ' + site.subtagline,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${site.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  });
}

function schemaWebPage(page, url) {
  const bc = breadcrumbParts(page);
  return jsonLD({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title,
    "url": url,
    "description": page.title + '. A resource from Umbrella.lgbt, the everything queer app.',
    "isPartOf": {
      "@type": "WebSite",
      "name": site.name,
      "url": site.url
    }
  });
}

function schemaBreadcrumb(page, url) {
  const bc = breadcrumbParts(page);
  return jsonLD({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": bc.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": p.label,
      "item": p.url
    }))
  });
}

function schemaFAQ(page) {
  return jsonLD({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": page.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": page.content.replace(/<[^>]*>/g, '').substring(0, 5000)
      }
    }]
  });
}

function schemaArticle(page, url, date) {
  return jsonLD({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": page.title,
    "url": url,
    "datePublished": date || '2026',
    "dateModified": date || '2026',
    "author": {
      "@type": "Organization",
      "name": site.name,
      "url": site.url
    },
    "publisher": {
      "@type": "Organization",
      "name": site.name,
      "url": site.url
    },
    "description": page.title + '. A resource from Umbrella.lgbt, the everything queer app.'
  });
}

function generateSchema(page, url, mdContent) {
  const schemas = [];
  schemas.push(schemaWebPage(page, url));
  schemas.push(schemaBreadcrumb(page, url));
  if (page.type === 'qa' && page.seeded) {
    schemas.push(schemaFAQ({ ...page, content: mdContent }));
  }
  if (page.type === 'blog' && page.seeded) {
    schemas.push(schemaArticle(page, url, page.date));
  }
  return schemas.join('\n');
}

function generateHomeSchema() {
  return [schemaOrganization(), schemaWebSite(site.url)].join('\n');
}

function buildPage(page) {
  let mdContent = '';
  const isContentType = ['qa', 'glossary', 'city', 'resources', 'blog'].includes(page.type);

  if (page.seeded) {
    const mdPath = path.join('content', page.type, `${page.slug}.md`);
    if (fs.existsSync(mdPath)) {
      mdContent = fs.readFileSync(mdPath, 'utf8');
    } else {
      page.seeded = false;
    }
  }

  const typeTemplate = getTemplate(page);
  let contentHTML = '';

  let mdHTML = page.seeded ? mdToHTML(mdContent, { stripFirstH1: page.type === 'blog' }) : '';
  const metaDesc = extractMetaDescription(mdContent, page);
  const rawText = page.seeded ? stripHTML(mdHTML) : '';

  const templateVars = {
    _seeded: page.seeded,
    title: page.title,
    topic: page.topic || '',
    category: page.category || '',
    date: page.date || '',
    readingTime: page.seeded ? Math.ceil(mdContent.split(/\s+/).length / 200) : 0,
    launchYear: site.launchYear,
    content: mdHTML
  };

  if (page.type === 'qa' && page.seeded) {
    const related = findRelated(page, pages, 'qa', 5);
    templateVars.relatedQA = related.map(r => `<li><a href="/qa/${r.slug}">${r.title}</a></li>`).join('');
    const crossGlossary = findCrossTypeLinks(page, pages, ['glossary'], 3);
    templateVars.crossLinks = crossGlossary.length > 0
      ? '<section class="qa-related"><h3>Related Glossary Terms</h3><ul>'
        + crossGlossary.map(r => `<li><a href="/glossary/${r.slug}">${r.title}</a></li>`).join('')
        + '</ul></section>'
      : '';
  }

  if (page.type === 'glossary' && page.seeded) {
    const related = findRelated(page, pages, 'glossary', 5);
    templateVars.relatedTerms = related.map(r => `<li><a href="/glossary/${r.slug}">${r.title}</a></li>`).join('');
    const crossQA = findCrossTypeLinks(page, pages, ['qa'], 3);
    templateVars.crossLinks = crossQA.length > 0
      ? '<section class="glossary-related"><h3>Related Questions</h3><ul>'
        + crossQA.map(r => `<li><a href="/qa/${r.slug}">${r.title}</a></li>`).join('')
        + '</ul></section>'
      : '';
  }

  if (page.type === 'city' && page.seeded) {
    const other = findRelated(page, pages, 'city', 10);
    templateVars.otherCities = other.map(r => `<li><a href="/city/${r.slug}">${r.title}</a></li>`).join('');
  }

  if (page.type === 'resources' && page.seeded) {
    const other = findRelated(page, pages, 'resources', 5);
    templateVars.otherResources = other.map(r => `<li><a href="/resources/${r.slug}">${r.title}</a></li>`).join('');
  }

  if (page.type === 'blog' && page.seeded) {
    const related = findRelated(page, pages, 'blog', 3);
    templateVars.relatedPosts = related.map(r => `<li><a href="/blog/${r.slug}">${r.title}</a></li>`).join('');
    const crossQA = findCrossTypeLinks(page, pages, ['qa'], 2);
    const crossGloss = findCrossTypeLinks(page, pages, ['glossary'], 2);
    templateVars.crossLinks = (crossQA.length > 0 || crossGloss.length > 0)
      ? '<section class="blog-related"><h3>Related Q&A + Glossary</h3><ul>'
        + crossQA.map(r => `<li><a href="/qa/${r.slug}">${r.title}</a></li>`).join('')
        + crossGloss.map(r => `<li><a href="/glossary/${r.slug}">${r.title}</a></li>`).join('')
        + '</ul></section>'
      : '';
  }

  if (!page.seeded) {
    templateVars.crossLinks = '';
  }

  contentHTML = render(typeTemplate, templateVars);

  const url = `${site.url}${pageURL(page)}`;
  const extraCSS = page.type !== 'core' ? `<link rel="stylesheet" href="/styles/${page.type === 'resources' ? 'blog' : page.type}.css">` : '';

  const baseVars = {
    title: fullTitle(page),
    description: metaDesc,
    robots: page.seeded ? 'index, follow' : 'noindex, nofollow',
    canonical: url,
    ogTitle: page.seeded ? page.title + ' | Umbrella.lgbt' : page.title + ' — Umbrella.lgbt',
    ogType: page.type === 'blog' ? 'article' : 'website',
    schema: generateSchema(page, url, rawText),
    extraCSS,
    xIcon: X_ICON,
    breadcrumbs: breadcrumbsHTML(page),
    content: contentHTML,
    launchYear: site.launchYear
  };

  let fullHTML = render(baseTemplate, baseVars);

  const outPath = pageOutputPath(page);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, fullHTML);

  return page;
}

function buildHome() {
  const seededPages = pages.filter(p => p.seeded);
  const seededBlogs = pages.filter(p => p.type === 'blog' && p.seeded).slice(0, 2);
  const seededQAs = pages.filter(p => p.type === 'qa' && p.seeded).slice(0, 2);
  const seededCities = pages.filter(p => p.type === 'city' && p.seeded).slice(0, 5);

  let blogPreview = '';
  if (seededBlogs.length > 0) {
    blogPreview = seededBlogs.map(b => `
      <div class="hd-preview-card">
        <a href="/blog/${b.slug}">${b.title}</a>
        <time>${b.date || ''}</time>
      </div>`).join('');
  } else {
    blogPreview = '<p class="hd-empty">Blog posts coming soon.</p>';
  }

  let qaPreview = '';
  if (seededQAs.length > 0) {
    qaPreview = seededQAs.map(q => `
      <div class="hd-preview-card">
        <a href="/qa/${q.slug}">${q.title}</a>
      </div>`).join('');
  } else {
    qaPreview = '<p class="hd-empty">Q&amp;A coming soon.</p>';
  }

  let cityPreview = '';
  if (seededCities.length > 0) {
    cityPreview = seededCities.map(c => `
      <div class="hd-city-card">
        <a href="/city/${c.slug}">${c.title.replace('Queer ', '').replace(' Guide', '')}</a>
      </div>`).join('');
  } else {
    cityPreview = '<p class="hd-empty">City guides coming soon.</p>';
  }

  const homeVars = {
    launchYear: site.launchYear,
    blogPreview,
    qaPreview,
    cityPreview,
    xIcon: X_ICON
  };

  let homeContent = render(homeTemplate, homeVars);

  const baseVars = {
    title: site.name + ' — ' + site.tagline,
    description: site.tagline + '. ' + site.subtagline + '. A platform built by and for the LGBTQ+ community. Find queer community, answers, events, and resources — all under one umbrella.',
    robots: 'index, follow',
    canonical: site.url,
    ogTitle: site.name + ' — ' + site.tagline,
    ogType: 'website',
    schema: generateHomeSchema(),
    extraCSS: '<link rel="stylesheet" href="/styles/home-mobile.css"><link rel="stylesheet" href="/styles/home-desktop.css">',
    xIcon: X_ICON,
    breadcrumbs: '',
    content: homeContent,
    launchYear: site.launchYear
  };

  let fullHTML = render(baseTemplate, baseVars);
  fs.writeFileSync('public/index.html', fullHTML);
}

function buildIndexPages() {
  const types = ['qa', 'glossary', 'city', 'resources', 'blog'];
  const labels = { qa: 'Q&A', glossary: 'Glossary', city: 'City Guides', resources: 'Resources', blog: 'Blog' };

  for (const type of types) {
    const typePages = pages.filter(p => p.type === type);
    const seeded = typePages.filter(p => p.seeded);

    let listHTML = `<h1>${labels[type]}</h1>`;
    if (seeded.length > 0) {
      listHTML += '<ul class="index-list">';
      listHTML += seeded.map(p => `<li><a href="/${type}/${p.slug}">${p.title}</a></li>`).join('');
      listHTML += '</ul>';
    }
    if (typePages.filter(p => !p.seeded).length > 0) {
      listHTML += `<p class="index-coming">More coming soon &mdash; <a href="/waitlist">join the waitlist</a>.</p>`;
    }

    const idxUrl = `${site.url}/${type}`;
    const baseVars = {
      title: indexFullTitle(labels[type]),
      description: `${labels[type]} — Umbrella.lgbt, the everything queer app. Browse ${labels[type].toLowerCase()} for the LGBTQ+ community.`,
      robots: 'index, follow',
      canonical: idxUrl,
      ogTitle: labels[type] + ' | Umbrella.lgbt',
      ogType: 'website',
      schema: jsonLD({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": labels[type],
        "url": idxUrl,
        "description": `${labels[type]} — Umbrella.lgbt, the everything queer app.`,
        "isPartOf": { "@type": "WebSite", "name": site.name, "url": site.url }
      }) + '\n' + jsonLD({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": site.name, "item": site.url },
          { "@type": "ListItem", "position": 2, "name": labels[type], "item": idxUrl }
        ]
      }),
      extraCSS: `<link rel="stylesheet" href="/styles/pages.css">`,
      xIcon: X_ICON,
      breadcrumbs: `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="/">${site.name}</a></li><li aria-current="page">${labels[type]}</li></ol></nav>`,
      content: `<div class="page">${listHTML}</div>`,
      launchYear: site.launchYear
    };

    let fullHTML = render(baseTemplate, baseVars);
    ensureDir(`public/${type}`);
    fs.writeFileSync(`public/${type}/index.html`, fullHTML);
  }
}

function buildSitemap() {
  const seeded = pages.filter(p => p.seeded);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  xml += `  <url>\n    <loc>${site.url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

  const typePriorities = { core: 0.8, qa: 0.9, glossary: 0.7, city: 0.6, resources: 0.6, blog: 0.8 };

  for (const p of seeded) {
    const priority = typePriorities[p.type] || 0.5;
    xml += `  <url>\n    <loc>${site.url}${pageURL(p)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  }

  const types = ['qa', 'glossary', 'city', 'resources', 'blog'];
  const anySeeded = {};
  for (const t of types) {
    anySeeded[t] = pages.filter(p => p.type === t && p.seeded).length > 0;
  }

  for (const t of types) {
    if (anySeeded[t]) {
      xml += `  <url>\n    <loc>${site.url}/${t}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
  }

  xml += '</urlset>\n';
  fs.writeFileSync('public/sitemap.xml', xml);
}

function buildRobots() {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`;
  fs.writeFileSync('public/robots.txt', robots);
}

function build404() {
  const baseVars = {
    title: '404 — Not Found',
    description: 'Page not found.',
    robots: 'noindex, nofollow',
    canonical: site.url + '/404',
    ogTitle: '404 | Umbrella.lgbt',
    ogType: 'website',
    schema: '',
    extraCSS: '<link rel="stylesheet" href="/styles/pages.css">',
    xIcon: X_ICON,
    breadcrumbs: '',
    content: `<div class="page"><h1>404</h1><p>This page doesn't exist yet.</p><p><a href="/">Go home</a></p></div>`,
    launchYear: site.launchYear
  };

  let fullHTML = render(baseTemplate, baseVars);
  fs.writeFileSync('public/404.html', fullHTML);
}

function copyStatic() {
  const staticDir = 'static';
  if (!fs.existsSync(staticDir)) return;
  const copyRecursive = (src, dest) => {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        ensureDir(destPath);
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  copyRecursive(staticDir, 'public');
}

ensureDir('public');
copyStatic();
ensureDir('public/styles');
ensureDir('public/assets');
ensureDir('public/scripts');

for (const page of pages) {
  buildPage(page);
}

buildHome();
buildIndexPages();
buildSitemap();
buildRobots();
build404();

const seededCount = pages.filter(p => p.seeded).length;
console.log(`Built ${pages.length + 1} pages (${seededCount} seeded, ${pages.length - seededCount} unseeded)`);
console.log(`Sitemap: ${seededCount + 1} URLs`);
console.log('Done.');
