import type { ReactNode } from "react";
import type { Channel, Status } from "../types";
import { CHANNEL_ICONS, STATUS_COLORS, STATUS_LABELS } from "../lib/constants";

export function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ChannelIcons({ channels }: { channels: Channel[] }) {
  return (
    <span className="text-sm" title={channels.join(", ")}>
      {channels.map((c) => CHANNEL_ICONS[c]).join(" ")}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones: Record<string, string> = {
    default: "text-slate-900",
    good: "text-green-600",
    warn: "text-yellow-600",
    bad: "text-red-600",
  };
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  title,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
}) {
  const variants: Record<string, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
