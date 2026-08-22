import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Join | Umbrella.lgbt',
  robots: { index: false, follow: false }
};

export default function RegisterPage() {
  return <RegisterForm />;
}
