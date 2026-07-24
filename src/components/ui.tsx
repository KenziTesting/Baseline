"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Check, Spinner } from "./icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`surface p-5 ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "subtle" | "danger";
  loading?: boolean;
}) {
  const styles = {
    primary:
      "bg-gradient-to-b from-amber-400 to-amber-600 text-court-950 hover:from-amber-300 hover:to-amber-500 shadow-[0_8px_24px_-8px_rgba(245,165,36,0.7)] disabled:opacity-40",
    ghost: "bg-court-800 text-white hover:bg-court-700 disabled:opacity-40",
    subtle: "bg-transparent text-white/60 hover:text-white hover:bg-court-800 disabled:opacity-40",
    danger: "bg-transparent text-readiness-red hover:bg-court-800",
  }[variant];
  return (
    <button
      className={`pressable flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold tracking-tight transition-colors ${styles} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner className="h-5 w-5" />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-white/75">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-[56px] w-full rounded-2xl border border-white/[0.08] bg-court-850 px-4 text-base font-medium text-white outline-none transition-colors placeholder:font-normal placeholder:text-white/25 focus:border-amber-500/70 focus:bg-court-800 ${props.className ?? ""}`}
    />
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <Segment key={o.value} label={o.label} active={o.value === value} onClick={() => onChange(o.value)} />
      ))}
    </div>
  );
}

/** Multi-select variant — order of selection is preserved (first = primary). */
export function MultiSegmentedControl<T extends string>({
  options,
  values,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  values: T[];
  onChange: (v: T[]) => void;
  columns?: number;
}) {
  const toggle = (v: T) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const idx = values.indexOf(o.value);
        return (
          <Segment
            key={o.value}
            label={o.label}
            active={idx >= 0}
            badge={idx === 0 && values.length > 1 ? "1st" : undefined}
            onClick={() => toggle(o.value)}
          />
        );
      })}
    </div>
  );
}

function Segment({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pressable relative flex min-h-[50px] items-center justify-center rounded-xl border px-3 text-sm font-bold transition-colors ${
        active
          ? "border-amber-500/60 bg-amber-500/[0.14] text-amber-300"
          : "border-white/[0.07] bg-court-850 text-white/65 hover:border-white/15 hover:text-white/85"
      }`}
    >
      {active && <Check className="mr-1.5 h-3.5 w-3.5" />}
      {label}
      {badge && (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-court-950">
          {badge}
        </span>
      )}
    </button>
  );
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  leftLabel,
  rightLabel,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  leftLabel?: string;
  rightLabel?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-white/80">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
      {(leftLabel || rightLabel) && (
        <div className="mt-2 flex justify-between text-xs text-white/40">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ total, current }: { total: number; current: number }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-court-800">
      <div
        className="h-full rounded-full bg-amber-500 transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Circular similarity score ring (SVG), animated draw on mount. */
export function ScoreRing({
  value,
  size = 120,
  stroke = 9,
  label,
  color = "#f5a524",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - value / 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#26262e" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className="animate-ring-draw"
          style={
            {
              "--circumference": `${circumference}`,
              "--dashoffset": `${dashoffset}`,
              strokeDashoffset: dashoffset,
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl leading-none text-white">{Math.round(value)}</span>
        {label && <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>}
      </div>
    </div>
  );
}
