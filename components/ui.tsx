"use client";

/** Design-system primitives shared by every page. */
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { CloseIcon } from "./icons";

/* ------------------------------------------------------------------ Buttons */

type ButtonVariant = "primary" | "secondary" | "danger" | "dangerSolid" | "ghost" | "dark";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm shadow-emerald-900/20 ring-1 ring-inset ring-emerald-700/50 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-600/45 disabled:shadow-none disabled:ring-0",
  secondary:
    "bg-white text-zinc-800 shadow-xs ring-1 ring-inset ring-zinc-950/10 hover:bg-zinc-50 hover:ring-zinc-950/15 active:bg-zinc-100 disabled:text-zinc-400",
  danger:
    "bg-white text-red-600 shadow-xs ring-1 ring-inset ring-red-600/20 hover:bg-red-50 active:bg-red-100 disabled:text-red-300",
  dangerSolid:
    "bg-red-600 text-white shadow-sm shadow-red-900/20 ring-1 ring-inset ring-red-700/50 hover:bg-red-500 active:bg-red-700 disabled:bg-red-600/45",
  ghost: "text-zinc-600 hover:bg-zinc-950/[0.04] hover:text-zinc-900 active:bg-zinc-950/[0.07]",
  dark: "bg-zinc-900 text-white shadow-sm shadow-zinc-950/20 hover:bg-zinc-800 active:bg-zinc-950 disabled:bg-zinc-900/45",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-2.5 text-[13px] [&_svg]:size-3.5",
  md: "h-9 rounded-lg px-3.5 text-sm [&_svg]:size-4",
  lg: "h-11 rounded-xl px-5 text-[15px] [&_svg]:size-4",
};

/** Class string for anything that should look like a button (e.g. a Link). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return `inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap font-medium transition-[background-color,box-shadow,color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed [&_svg]:shrink-0 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------- Inputs */

export const inputClass =
  "block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs ring-1 ring-inset ring-zinc-950/10 transition-shadow placeholder:text-zinc-400 hover:ring-zinc-950/20 focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-500";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

/** Accessible on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-600" : "bg-zinc-200 ring-1 ring-inset ring-zinc-950/5"
      }`}
    >
      <span
        aria-hidden
        className={`inline-block size-4 rounded-full bg-white shadow-sm ring-1 ring-zinc-950/5 transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ Surfaces */

export function Card({
  children,
  className = "",
  flush = false,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  /** Drop the default padding (for lists and tables that run edge to edge). */
  flush?: boolean;
  /** "danger" draws a red outline, e.g. for an overdue loan. */
  tone?: "default" | "danger";
}) {
  const ring = tone === "danger" ? "ring-red-500/30" : "ring-zinc-950/[0.07]";
  return (
    <div className={`rounded-2xl bg-white shadow-card ring-1 ${ring} ${flush ? "" : "p-5"} ${className}`}>
      {children}
    </div>
  );
}

/** A card with a titled header row and an optional action on the right. */
export function Panel({
  title,
  description,
  count,
  action,
  icon,
  children,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  count?: number;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-white shadow-card ring-1 ring-zinc-950/[0.07] ${className}`}>
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon && (
            <span className="mt-px grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 [&_svg]:size-3.5">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              {title}
              {count !== undefined && <CountChip>{count}</CountChip>}
            </h2>
            {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="border-t border-zinc-950/[0.06]">{children}</div>
    </section>
  );
}

export function CountChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" }) {
  const styles = {
    neutral: "bg-zinc-100 text-zinc-600",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Badges */

type Tone = "neutral" | "green" | "amber" | "red" | "blue" | "violet";

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-zinc-100 text-zinc-700 ring-zinc-500/15", dot: "bg-zinc-400" },
  green: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  amber: { pill: "bg-amber-50 text-amber-800 ring-amber-600/25", dot: "bg-amber-500" },
  red: { pill: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  blue: { pill: "bg-sky-50 text-sky-700 ring-sky-600/20", dot: "bg-sky-500" },
  violet: { pill: "bg-violet-50 text-violet-700 ring-violet-600/20", dot: "bg-violet-500" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  icon,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset [&_svg]:size-3 ${tones[tone].pill}`}
    >
      {dot && <span aria-hidden className={`size-1.5 rounded-full ${tones[tone].dot}`} />}
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- Avatars */

const AVATAR_TINTS = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
];

function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const sizes = {
    xs: "size-5 text-[9px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-xs",
    lg: "size-10 text-sm",
  };
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-white ${sizes[size]} ${AVATAR_TINTS[hash % AVATAR_TINTS.length]}`}
    >
      {initials(name)}
    </span>
  );
}

/* --------------------------------------------------------------- Page chrome */

export function PageHeader({
  title,
  eyebrow,
  description,
  action,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[13px] font-medium text-emerald-700">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px] sm:leading-9">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-zinc-500">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  children,
  count,
  description,
  action,
}: {
  children: ReactNode;
  count?: number;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
          {children}
          {count !== undefined && <CountChip>{count}</CountChip>}
        </h2>
        {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const statTones = {
  neutral: "bg-zinc-100 text-zinc-600 ring-zinc-950/5",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-600 ring-amber-600/15",
  red: "bg-red-50 text-red-600 ring-red-600/15",
  blue: "bg-sky-50 text-sky-600 ring-sky-600/15",
  violet: "bg-violet-50 text-violet-600 ring-violet-600/15",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
  loading = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: keyof typeof statTones;
  href?: string;
  loading?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{label}</p>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset [&_svg]:size-4 ${statTones[tone]}`}
        >
          {icon}
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-14" />
          <Skeleton className="mt-2 h-4 w-28" />
        </>
      ) : (
        <>
          <p className="mt-1 text-[32px] leading-10 font-semibold tracking-tight text-zinc-950 tabular-nums">{value}</p>
          {hint && <div className="mt-0.5 text-[13px] text-zinc-500">{hint}</div>}
        </>
      )}
    </>
  );
  const base = "relative block rounded-2xl bg-white p-5 shadow-card ring-1 ring-zinc-950/[0.07]";
  if (!href) return <div className={base}>{body}</div>;
  return (
    <Link
      href={href}
      className={`${base} transition duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600`}
    >
      {body}
    </Link>
  );
}

/* ---------------------------------------------------------- Empty / loading */

export function EmptyState({
  title,
  icon,
  action,
  children,
  compact = false,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-dashed border-zinc-300/80 bg-zinc-50/50 text-center ${
        compact ? "px-6 py-8" : "px-6 py-14"
      }`}
    >
      {icon && (
        <span className="mb-3 grid size-11 place-items-center rounded-xl bg-white text-zinc-500 shadow-card ring-1 ring-zinc-950/[0.07] [&_svg]:size-5">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-medium text-zinc-900">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-zinc-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-shimmer rounded-lg bg-zinc-200/70 ${className}`} />;
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-12 text-sm text-zinc-500">
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600"
      />
      {label}
    </div>
  );
}

/** Placeholder rows shaped like the content that is about to load. */
export function SkeletonList({ rows = 3, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-zinc-950/[0.07]">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Inline form error, announced to screen readers. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-inset ring-red-600/15">
      {message}
    </p>
  );
}

/* ------------------------------------------------------------------- Filters */

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-zinc-950/[0.04] p-1 ring-1 ring-inset ring-zinc-950/5"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-emerald-600 ${
              active
                ? "bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-950/10"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                  active ? "bg-zinc-100 text-zinc-700" : "bg-zinc-950/5 text-zinc-500"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------------- Modal */

/**
 * Native <dialog> as a modal: focus is trapped, Escape closes it, and the page
 * behind is inert. Children mount only while open, so forms start fresh.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a backdrop click.
        if (event.target === event.currentTarget) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] overflow-visible rounded-2xl bg-transparent p-0 text-zinc-900 open:animate-dialog-in ${
        size === "lg" ? "max-w-2xl" : "max-w-lg"
      }`}
    >
      {open && (
        <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-950/10">
          <div className="flex items-start gap-3 px-6 pt-5 pb-4">
            {icon && (
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-zinc-100 text-zinc-700 [&_svg]:size-5">
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id={titleId} className="text-base font-semibold text-zinc-950">
                {title}
              </h2>
              {description && <div className="mt-0.5 text-[13px] text-zinc-500">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-1 -mr-2 grid size-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
          <div className="border-t border-zinc-950/[0.06] px-6 pt-5 pb-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
