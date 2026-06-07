import { useMemo } from "react";
import { useStore } from "../lib/store";
import { isOverdue } from "../lib/helpers";
import { ACCESS_LABELS } from "../lib/permissions";

export type ViewKey =
  | "dashboard"
  | "brands"
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
  const { config, items, currentUserId, setCurrentUser, brands, currentBrandId, currentBrand, switchBrand } = useStore();
  const currentLevel = config.members.find((m) => m.id === currentUserId)?.accessLevel;

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
    { key: "brands", label: "Brand / Project", icon: "🏢" },
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
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Brand aktif</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${currentBrand.type === "internal" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
            {currentBrand.type}
          </span>
        </div>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800"
          value={currentBrandId}
          onChange={(e) => switchBrand(e.target.value)}
        >
          <optgroup label="Internal">
            {brands.filter((b) => b.type === "internal").map((b) => (
              <option key={b.id} value={b.id}>{b.config.brandName}{b.status === "nonaktif" ? " (nonaktif)" : ""}</option>
            ))}
          </optgroup>
          <optgroup label="Eksternal">
            {brands.filter((b) => b.type === "eksternal").map((b) => (
              <option key={b.id} value={b.id}>{b.config.brandName}{b.status === "nonaktif" ? " (nonaktif)" : ""}</option>
            ))}
          </optgroup>
        </select>
        <div className="mt-1 text-xs capitalize text-slate-400">{config.industry} · {config.members.length} anggota</div>
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

      <div className="border-t border-slate-200 p-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-slate-400">Akun (login sebagai)</label>
          {currentLevel && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{ACCESS_LABELS[currentLevel]}</span>
          )}
        </div>
        <select
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          value={currentUserId ?? ""}
          onChange={(e) => setCurrentUser(e.target.value || null)}
        >
          {config.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.accessLevel ? ` · ${ACCESS_LABELS[m.accessLevel]}` : ""}</option>)}
        </select>
      </div>
    </aside>
  );
}
