import { SITE, breadcrumbJson } from '@/lib/seo';

export interface Crumb {
  name: string;
  url?: string;
}

export function Breadcrumbs({ parts }: { parts: Crumb[] }) {
  const full: Crumb[] = [{ name: SITE.name, url: SITE.url }, ...parts];
  return (
    <nav aria-label="Breadcrumb" className="meta" style={{ marginBottom: 12 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson(full)) }}
      />
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {full.map((p, i) => {
          const last = i === full.length - 1;
          return (
            <li key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {p.url && !last ? <a href={p.url}>{p.name}</a> : <span>{p.name}</span>}
              {!last ? <span aria-hidden>›</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
