import type { ReactNode } from 'react';

const paths = {
  close: 'M6 6l12 12M18 6L6 18',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  link: 'M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1',
  list: 'M4 6h16M4 12h16M4 18h10',
  back: 'M15 18l-6-6 6-6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  check: 'M5 12l5 5 9-10',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'size-4' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
  /** What the buttons change, for screen readers: "Decrease {label}". */
  label: string;
  /** Show a trash can instead of a minus at the minimum + 1 (decrementing removes). */
  removes?: boolean;
  children?: ReactNode;
}

/** − value + */
export function Stepper({ value, onChange, min, max = Infinity, label, removes, children }: StepperProps) {
  const removing = removes && value - 1 === min;
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-line sm:h-8">
      <button
        type="button"
        className="btn btn-ghost btn-icon h-full rounded-r-none"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={removing ? `Remove ${label}` : `Decrease ${label}`}
      >
        <Icon name={removing ? 'trash' : 'minus'} className="size-3.5" />
      </button>
      <span className="min-w-6 px-1 text-center text-sm tabular-nums">{children ?? value}</span>
      <button
        type="button"
        className="btn btn-ghost btn-icon h-full rounded-l-none"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label}`}
      >
        <Icon name="plus" className="size-3.5" />
      </button>
    </div>
  );
}

/** Battle points spent against the budget; turns red past it. */
export function BudgetBar({ spent, available, className = '' }: { spent: number; available: number; className?: string }) {
  const over = spent > available;
  const width = available > 0 ? Math.min(100, (spent / available) * 100) : spent ? 100 : 0;
  return (
    <div
      className={`h-1 overflow-hidden rounded-full bg-line ${className}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={available}
      aria-valuenow={spent}
      aria-label={`${spent} of ${available} battle points`}
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${over ? 'bg-danger' : 'bg-accent'}`} style={{ width: `${width}%` }} />
    </div>
  );
}
