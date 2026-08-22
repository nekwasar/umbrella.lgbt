import { UserProvider } from '@/components/public/UserProvider';
import { PublicHeader, Wordmark } from '@/components/public/PublicHeader';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <div className="rainbow-strip" />
        <main className="container flex-1 py-6">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <div className="footer-grid">
              <div className="footer-col">
                <Wordmark size={16} />
                <p className="faint" style={{ marginTop: 6, fontSize: 11 }}>
                  The everything queer app. Built by and for the LGBTQ+ community.
                </p>
              </div>
              <div className="footer-col">
                <h5>Explore</h5>
                <a href="/blog">Blog</a>
                <a href="/glossary">Glossary</a>
                <a href="/qa">Q&amp;A</a>
                <a href="/city">City Guides</a>
              </div>
              <div className="footer-col">
                <h5>Company</h5>
                <a href="/about">About</a>
                <a href="/features">Features</a>
                <a href="/press">Press</a>
                <a href="/contact">Contact</a>
              </div>
              <div className="footer-col">
                <h5>Resources</h5>
                <a href="/resources">Country Resources</a>
                <a href="/privacy">Privacy</a>
                <a href="/waitlist">Waitlist</a>
                <a href="https://x.com/cocortech">X (Twitter)</a>
              </div>
            </div>
            <div className="hr" />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                paddingBottom: 14
              }}
            >
              <span>&copy; 2026 Umbrella.lgbt</span>
              <a href="mailto:hello@umbrella.lgbt">hello@umbrella.lgbt</a>
            </div>
          </div>
        </footer>
      </div>
    </UserProvider>
  );
}
