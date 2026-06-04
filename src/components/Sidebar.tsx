import { useMemo } from "react";
import { useStore } from "../lib/store";
import { isOverdue } from "../lib/helpers";

export type ViewKey =
  | "dashboard"
  | "board"
  | "calendar"
  | "bank"
  | "pipeline"
  | "queue"
  | "analytics"
  | "approval"
  | "settings";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: string;
  show?: boolean;
  badge?: number;
}

export function Sidebar({ view, setView }: { view: ViewKey; setView: (v: ViewKey) => void }) {
  const { config, items, currentUserId, setCurrentUser } = useStore();

  const pendingApprovals = useMemo(
    () => items.filter((i) => i.approvalStatus === "pending").length,
    [items],
  );
  const myQueueCount = useMemo(
    () => items.filter((i) => i.currentPIC === currentUserId && !["tayang", "dianalisis", "batal", "expired"].includes(i.status)).length,
    [items, currentUserId],
  );
  const overdueCount = useMemo(() => items.filter(isOverdue).length, [items]);

  const nav: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: "🏠" },
    { key: "board", label: "Board", icon: "🗂️", badge: overdueCount || undefined },
    { key: "calendar", label: "Calendar", icon: "📅" },
    { key: "bank", label: "Content Bank", icon: "🏦" },
    { key: "pipeline", label: "Pipeline / List", icon: "📋" },
    { key: "queue", label: "My Queue", icon: "🎯", show: config.roleBasedViewsEnabled, badge: myQueueCount || undefined },
    { key: "analytics", label: "Analytics", icon: "📈" },
    { key: "approval", label: "Approval Inbox", icon: "✅", show: config.approvalEnabled, badge: pendingApprovals || undefined },
    { key: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Dashboard</div>
        <div className="truncate text-lg font-bold text-slate-800">{config.brandName}</div>
        <div className="mt-0.5 text-xs capitalize text-slate-400">{config.industry} · {config.members.length} anggota</div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {nav.filter((n) => n.show !== false).map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              view === n.key ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{n.icon}</span>
            <span className="flex-1 text-left">{n.label}</span>
            {n.badge ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{n.badge}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {config.roleBasedViewsEnabled && (
        <div className="border-t border-slate-200 p-3">
          <label className="mb-1 block text-xs text-slate-400">Login sebagai</label>
          <select
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            value={currentUserId ?? ""}
            onChange={(e) => setCurrentUser(e.target.value || null)}
          >
            {config.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
    </aside>
  );
}
