import Link from 'next/link';
import { Page } from '@/lib/types';

export function TypeIndexView({
  label,
  urlPrefix,
  items,
  emptyText
}: {
  label: string;
  urlPrefix: string;
  items: Page[];
  emptyText: string;
}) {
  return (
    <div>
      <h1 style={{ marginBottom: 10 }}>{label}</h1>
      <div className="band" style={{ marginBottom: 0 }}>
        {label}
      </div>
      <div className="row-list" style={{ borderTop: 'none' }}>
        {items.length === 0 ? (
          <div className="muted" style={{ fontStyle: 'italic' }}>
            {emptyText}
          </div>
        ) : (
          items.map((p) => (
            <Link key={p.id} href={`${urlPrefix}/${p.slug}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{p.title}</span>
              {p.category || p.topic ? <span className="tag">{p.category || p.topic}</span> : null}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
