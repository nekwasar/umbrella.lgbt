import Link from 'next/link';
import { mdToHtml } from '@/lib/sanitize';
import { Page } from '@/lib/types';

export function ArticleView({
  label,
  page,
  related,
  crossLinks,
  metaLine
}: {
  label: string;
  page: Page;
  related: Page[];
  crossLinks?: Page[];
  metaLine?: React.ReactNode;
}) {
  return (
    <article style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="band" style={{ marginBottom: 12 }}>
        {label}
      </div>

      <h1 style={{ marginBottom: 6 }}>{page.title}</h1>
      {metaLine ? <div className="meta" style={{ marginBottom: 10 }}>{metaLine}</div> : null}

      {page.contentMd ? (
        <div className="md-preview card-flat" style={{ padding: '12px 14px' }} dangerouslySetInnerHTML={{ __html: mdToHtml(page.contentMd) }} />
      ) : (
        <p className="muted">Coming soon.</p>
      )}

      {crossLinks && crossLinks.length > 0 ? (
        <section style={{ marginTop: 18 }}>
          <div className="band">Related resources</div>
          <div className="row-list" style={{ borderTop: 'none' }}>
            {crossLinks.map((r) => (
              <Link key={r.id} href={r.url}>
                <span style={{ fontWeight: 600 }}>{r.title}</span>
                <span className="tag" style={{ marginLeft: 6 }}>
                  {r.type.toLowerCase()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section style={{ marginTop: 18 }}>
          <div className="band">
            More {label.toLowerCase()}
          </div>
          <div className="row-list" style={{ borderTop: 'none' }}>
            {related.map((r) => (
              <Link key={r.id} href={r.url}>
                <span style={{ fontWeight: 600 }}>{r.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
