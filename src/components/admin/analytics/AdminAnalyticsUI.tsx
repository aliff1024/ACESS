'use client';

/**
 * Shared presentation pieces for the admin analytics surfaces.
 *
 * Dashboard, Analytics and Reports previously each rolled their own cards,
 * chart wrappers and empty states — which is why the same figure could look
 * like two different things depending on the page. These are the one set.
 */

import { ReactNode } from 'react';
import { AlertCircle, ArrowDownRight, ArrowRight, ArrowUpRight, Loader2 } from 'lucide-react';
import type { Change, RangeKey } from '@/lib/admin-api';
import { RANGE_KEYS, RANGE_LABELS } from '@/lib/admin-api';

// ─── Range picker ────────────────────────────────────────────────────────

export function RangePicker({
  value,
  onChange,
  disabled,
}: {
  value: RangeKey;
  onChange: (r: RangeKey) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1"
    >
      {RANGE_KEYS.map((key) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 ${
              active
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {RANGE_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Change badge ────────────────────────────────────────────────────────

/**
 * Renders a period-over-period delta only when the server computed one.
 * A suppressed delta shows the prior-period count instead of a percentage —
 * "vs 2 before" is honest where "+150%" would not be.
 */
export function ChangeBadge({ change }: { change: Change | null | undefined }) {
  if (!change) return null;

  if (change.percent === null) {
    return (
      <span className="text-xs text-gray-500" title="Too few records in the previous period for a meaningful percentage">
        vs {change.previous.toLocaleString()} before
      </span>
    );
  }

  const up = change.direction === 'up';
  const flat = change.direction === 'flat';
  const Icon = flat ? ArrowRight : up ? ArrowUpRight : ArrowDownRight;
  const tone = flat
    ? 'bg-gray-100 text-gray-600'
    : up
      ? 'bg-green-50 text-green-700'
      : 'bg-amber-50 text-amber-700';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {change.percent > 0 ? '+' : ''}
      {change.percent}%
      <span className="sr-only">compared with the previous period</span>
    </span>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────

/**
 * Describes a change in words, for use beside a headline that is a running
 * total. A percentage badge pinned to a total implies the total moved by that
 * amount — "-100%" next to "25 total users" reads as losing every user, when
 * what fell to zero was the number who joined during the period.
 */
export function describeChange(change: Change | null | undefined, noun: string): string | null {
  if (!change) return null;
  if (change.percent === null) return `vs ${change.previous.toLocaleString()} ${noun} before`;
  const sign = change.percent > 0 ? '+' : '';
  return `${sign}${change.percent}% vs ${change.previous.toLocaleString()} ${noun} before`;
}

export function KpiCard({
  label,
  value,
  sublabel,
  change,
  changeNote,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  /** Only for cards whose headline value is itself period-scoped. */
  change?: Change | null;
  /** Comparison text for cards whose headline is a running total. */
  changeNote?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'blue' | 'green' | 'purple' | 'amber' | 'teal';
}) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    teal: 'bg-teal-50 text-teal-700',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ChangeBadge change={change} />
      </div>
      <p className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
      {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
      {changeNote && <p className="mt-0.5 text-xs text-gray-400">{changeNote}</p>}
    </div>
  );
}

// ─── Panel with loading / error / empty states ───────────────────────────

export function Panel({
  title,
  question,
  action,
  loading,
  error,
  isEmpty,
  emptyMessage,
  children,
  className = '',
}: {
  title: string;
  /** the administrative question this panel answers */
  question?: string;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-6 ${className}`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          {question && <p className="mt-0.5 text-sm text-gray-500">{question}</p>}
        </div>
        {action}
      </header>

      {loading ? (
        <div className="flex h-56 items-center justify-center" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="sr-only">Loading</span>
        </div>
      ) : error ? (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg bg-red-50 px-6 text-center">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      ) : isEmpty ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
          <p className="max-w-sm text-sm text-gray-500">
            {emptyMessage ?? 'No records in this range.'}
          </p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// ─── Data note ───────────────────────────────────────────────────────────

/**
 * States a limitation of the underlying data next to the figure it affects,
 * so a thin denominator or an excluded field is visible rather than implied.
 */
export function DataNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-gray-500">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none text-gray-400" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

// ─── Horizontal bar list ─────────────────────────────────────────────────

export function BarList({
  items,
  valueLabel,
  formatValue,
}: {
  items: { label: string; value: number; hint?: string }[];
  valueLabel?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <span className="truncate text-sm font-medium text-gray-800" title={item.label}>
              {item.label}
            </span>
            <span className="flex-none text-sm font-semibold tabular-nums text-gray-900">
              {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
              {valueLabel && <span className="ml-1 font-normal text-gray-500">{valueLabel}</span>}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          {item.hint && <p className="mt-1 text-xs text-gray-500">{item.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
