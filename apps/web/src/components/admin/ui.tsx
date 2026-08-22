'use client';

import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';

const inputBase =
  'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink shadow-none outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-faint disabled:opacity-60';

export function Field({
  label,
  hint,
  children,
  className = ''
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function Checkbox({
  label,
  checked,
  onChange,
  className = ''
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 text-sm text-ink ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line-strong accent-brand"
      />
      {label}
    </label>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:bg-black',
  secondary: 'border border-line-strong bg-white text-ink hover:border-brand hover:text-brand',
  danger: 'bg-[#b3272c] text-white hover:bg-[#931f23]',
  ghost: 'text-muted hover:text-ink hover:bg-line/40'
};

export function Button({
  variant = 'primary',
  loading,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className = ''
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'brand';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-line/60 text-muted',
    good: 'bg-[#dff0e6] text-good',
    warn: 'bg-[#f6e8cf] text-warn',
    brand: 'bg-brand-soft text-brand'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function Banner({
  kind,
  children,
  className = ''
}: {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    error: 'border-[#f0c9cb] bg-[#fbeaea] text-[#8f1d22]',
    success: 'border-[#bfe0cd] bg-[#eaf6ef] text-[#1f6b43]',
    info: 'border-[#d5cbe8] bg-[#f1ecf9] text-[#5d4691]'
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[kind]} ${className}`} role="alert">
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-line/20 px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
