import { useMemo } from "react";
import type { ModalControl } from "../viewTypes";
import type { ViewKey } from "../components/Sidebar";
import { STATUS_COLORS, STATUS_LABELS } from "../lib/constants";
import { fmtNum, isOverdue, showSalesFields, startOfWeek } from "../lib/helpers";
import { useStore } from "../lib/store";
import { Button, Card, StatCard } from "../components/ui";
import { ContentCard } from "../components/ContentCard";

const FUNNEL: { label: string; statuses: string[] }[] = [
  { label: "Ide", statuses: ["ide", "brief_ok"] },
  { label: "Produksi", statuses: ["produksi", "review", "revisi"] },
  { label: "Siap", statuses: ["siap", "bank"] },
  { label: "Tayang", statuses: ["tayang"] },
  { label: "Dianalisis", statuses: ["dianalisis"] },
];

export function Dashboard({ ctrl, setView }: { ctrl: ModalControl; setView: (v: ViewKey) => void }) {
  const { items, config } = useStore();
  const sales = showSalesFields(config.primaryGoals);

  const now = new Date();
  const monthItems = items.filter((i) => new Date(i.createdAt).getMonth() === now.getMonth());

  const overdue = useMemo(() => items.filter(isOverdue), [items]);
  const banked = items.filter((i) => i.isBanked && i.status !== "expired").length;
  const bankHealth = banked < config.bankHealthyMin ? "kurang" : banked > config.bankHealthyMax ? "menumpuk" : "sehat";

  // posting consistency: this week's tayang vs weekly target
  const weekStart = startOfWeek(now);
  const publishedThisWeek = items.filter(
    (i) => i.scheduledDate && new Date(i.scheduledDate) >= weekStart && ["tayang", "siap", "dianalisis"].includes(i.status),
  ).length;
  const weeklyTarget = config.postingTimes.reduce((s, p) => s + p.times.length, 0);
  const consistency = weeklyTarget ? Math.round((publishedThisWeek / weeklyTarget) * 100) : 0;

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of monthItems) m.set(i.status, (m.get(i.status) ?? 0) + 1);
    return m;
  }, [monthItems]);

  const totalConv = items.reduce((s, i) => s + (i.results?.conversions ?? 0), 0);
  const totalClicks = items.reduce((s, i) => s + (i.results?.linkClicks ?? 0), 0);

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{config.brandName}</h1>
          <p className="text-sm text-slate-500">Ringkasan eksekutif · {now.toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
        </div>
        <Button onClick={() => ctrl.open(null)}>+ Konten baru</Button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Konten bulan ini" value={monthItems.length} />
        <StatCard
          label="Konsistensi posting"
          value={`${consistency}%`}
          hint={`${publishedThisWeek}/${weeklyTarget} minggu ini`}
          tone={consistency < 70 ? "warn" : "good"}
        />
        <StatCard label="Kesehatan bank" value={bankHealth} hint={`${banked} siap pakai`} tone={bankHealth === "sehat" ? "good" : bankHealth === "kurang" ? "bad" : "warn"} />
        <StatCard label="Lewat deadline" value={overdue.length} tone={overdue.length ? "bad" : "good"} />
      </div>

      {sales && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Link clicks" value={fmtNum(totalClicks)} />
          <StatCard label="Konversi" value={fmtNum(totalConv)} tone="good" />
        </div>
      )}

      {/* Production funnel */}
      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">Funnel Produksi (bulan ini)</h2>
        <div className="flex items-end gap-2">
          {FUNNEL.map((f) => {
            const count = f.statuses.reduce((s, st) => s + (statusCounts.get(st) ?? 0), 0);
            const max = Math.max(1, ...FUNNEL.map((ff) => ff.statuses.reduce((s, st) => s + (statusCounts.get(st) ?? 0), 0)));
            return (
              <div key={f.label} className="flex flex-1 flex-col items-center">
                <span className="mb-1 text-sm font-semibold text-slate-700">{count}</span>
                <div className="flex w-full items-end" style={{ height: 90 }}>
                  <div className="w-full rounded-t bg-indigo-400" style={{ height: `${(count / max) * 100}%`, minHeight: 4 }} />
                </div>
                <span className="mt-1 text-xs text-slate-500">{f.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* status breakdown */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Konten per Status (bulan ini)</h2>
          <div className="space-y-1.5">
            {Array.from(statusCounts.entries()).map(([st, n]) => {
              const c = STATUS_COLORS[st as keyof typeof STATUS_COLORS];
              const max = Math.max(...Array.from(statusCounts.values()));
              return (
                <div key={st} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-slate-600">{STATUS_LABELS[st as keyof typeof STATUS_LABELS]}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full ${c.dot}`} style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-500">{n}</span>
                </div>
              );
            })}
            {statusCounts.size === 0 && <p className="text-sm text-slate-400">Belum ada konten bulan ini.</p>}
          </div>
        </Card>

        {/* overdue alarm */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">🚨 Lewat Deadline</h2>
            <button className="text-xs text-indigo-600 hover:underline" onClick={() => setView("board")}>Buka Board →</button>
          </div>
          {overdue.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada konten yang lewat deadline. 👍</p>
          ) : (
            <div className="space-y-2">
              {overdue.slice(0, 4).map((i) => (
                <ContentCard key={i.id} item={i} onClick={() => ctrl.open(i.id)} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
