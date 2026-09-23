import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-chestnut text-on-chestnut hover:brightness-110 border border-chestnut',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-chestnut hover:bg-chestnut-soft border border-transparent',
  danger: 'bg-burgundy-soft text-burgundy border border-burgundy/40 hover:brightness-95',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[0.95rem] font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed min-h-11';

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest} />;
}

export function ButtonLink({ to, variant = 'primary', className = '', children }: { to: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function Card({ children, className = '', as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</As>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent';
const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  good: 'bg-olive-soft text-olive',
  warn: 'bg-amber-soft text-amber',
  bad: 'bg-burgundy-soft text-burgundy',
  accent: 'bg-chestnut-soft text-chestnut',
};

export function Badge({ children, tone = 'neutral', title }: { children: ReactNode; tone?: Tone; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function UnverifiedBadge() {
  return (
    <Badge tone="warn" title="Not yet cross-checked against two independent sources. It may be wrong; please report it if so.">
      unverified
    </Badge>
  );
}

export function ProgressBar({ value, tone = 'accent', label }: { value: number; tone?: 'accent' | 'good' | 'bad' | 'warn'; label: string }) {
  const color = { accent: 'bg-chestnut', good: 'bg-olive', bad: 'bg-burgundy', warn: 'bg-amber' }[tone];
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-sm text-muted">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-4 text-center text-muted">{children}</p>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-muted/70 focus:border-chestnut focus:outline-none min-h-11';

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}
