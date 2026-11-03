"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import type { BatteryStatus, BudgetStatus } from "@/lib/types";

type Status = BudgetStatus | BatteryStatus;

const STATUS_TEXT: Record<Status, string> = {
  OK: "text-ok",
  WARNING: "text-warn",
  ERROR: "text-bad",
  FAILED: "text-bad",
};

const STATUS_FILL: Record<Status, string> = {
  OK: "bg-ok",
  WARNING: "bg-warn",
  ERROR: "bg-bad",
  FAILED: "bg-bad",
};

export function StatusLamp({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium ${STATUS_TEXT[status]}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${STATUS_FILL[status]}`} />
      {label ?? status}
    </span>
  );
}

export function Meter({ value, status, label }: { value: number; status: Status; label: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 overflow-hidden rounded-full bg-raised"
    >
      <div className={`h-full rounded-full transition-[width] duration-300 ${STATUS_FILL[status]}`} style={{ width: `${width}%` }} />
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-solar text-void font-medium hover:bg-solar-deep disabled:hover:bg-solar",
  ghost: "border border-line-strong text-ink hover:bg-raised disabled:hover:bg-transparent",
  danger: "border border-bad/60 text-bad hover:bg-bad/10",
};

export function Button({
  variant = "ghost",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Spinner({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-sm text-ink-dim">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-solar" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <p className="text-sm text-bad">{message}</p>
      {onRetry && <Button onClick={onRetry}>ลองอีกครั้ง</Button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong p-10 text-center">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

export function PageContainer({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="starfield flex-1">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
