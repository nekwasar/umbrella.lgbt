import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountForm } from '@/components/auth/AccountForm';
import { Breadcrumbs } from '@/components/public/Breadcrumbs';

export const metadata: Metadata = {
  title: 'My account | Umbrella.lgbt',
  description: 'Manage your Umbrella account — change your username.',
  robots: { index: false, follow: false }
};

export default function AccountPage() {
  return (
    <div>
      <Breadcrumbs parts={[{ name: 'My account' }]} />
      <h1>My account</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Change the username shown on your questions, answers, comments, and forum posts. Profile
        settings are coming soon.
      </p>
      <div className="card-flat" style={{ marginTop: 12, padding: 14 }}>
        <AccountForm />
      </div>
      <p className="faint" style={{ marginTop: 12 }}>
        Need a break instead? You can always <Link href="/login">sign out</Link>.
      </p>
    </div>
  );
}
