import { useMemo } from "react";
import type { ModalControl } from "../viewTypes";
import type { ContentItem } from "../types";
import { GOAL_LABELS } from "../lib/constants";
import { computeEngagement, fmtNum, memberName, showSalesFields } from "../lib/helpers";
import { useStore } from "../lib/store";
import { Card, EmptyState, StatCard } from "../components/ui";
import { FalcoInsights } from "../components/FalcoInsights";

export function Analytics({ ctrl }: { ctrl: ModalControl }) {
  const { items, config, createItem } = useStore();
  const sales = showSalesFields(config.primaryGoals);

  const published = useMemo(() => items.filter((i) => i.results && (i.results.views || i.results.engagement)), [items]);

  // aggregates
  const totalViews = published.reduce((s, i) => s + (i.results?.views ?? 0), 0);
  const totalEng = published.reduce((s, i) => s + computeEngagement(i), 0);
  const totalReach = published.reduce((s, i) => s + (i.results?.reach ?? 0), 0);
  const totalConv = published.reduce((s, i) => s + (i.results?.conversions ?? 0), 0);
  const totalClicks = published.reduce((s, i) => s + (i.results?.linkClicks ?? 0), 0);
  const engRate = totalReach ? ((totalEng / totalReach) * 100).toFixed(1) + "%" : "–";

  const byEng = [...published].sort((a, b) => computeEngagement(b) - computeEngagement(a));
  const top = byEng.slice(0, 3);
  const bottom = byEng.slice(-3).reverse();

  // per pillar / channel
  const perPillar = groupAgg(published, (i) => i.pillar);
  const perChannel = groupAgg(published, (i) => i.channel.join("+"));

  // system health
  const tayang = items.filter((i) => ["tayang", "dianalisis"].includes(i.status));
  const revisionRate = items.length ? Math.round((items.filter((i) => i.revisionCount > 0).length / items.length) * 100) : 0;
  const onTime = items.filter((i) => i.stageDeadline);
  const onTimeRate = onTime.length
    ? Math.round((onTime.filter((i) => new Date(i.updatedAt) <= new Date(i.stageDeadline! + "T23:59:59")).length / onTime.length) * 100)
    : 100;
  const cycleTimes = items
    .filter((i) => i.scheduledDate)
    .map((i) => (new Date(i.scheduledDate!).getTime() - new Date(i.createdAt).getTime()) / 86400000)
    .filter((d) => d > 0);
  const avgCycle = cycleTimes.length ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) : 0;

  // load per PIC
  const load = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) {
      if (i.currentPIC && !["tayang", "dianalisis", "bank", "batal", "expired"].includes(i.status)) {
        m.set(i.currentPIC, (m.get(i.currentPIC) ?? 0) + 1);
      }
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);
  const avgLoad = load.length ? load.reduce((s, [, n]) => s + n, 0) / load.length : 0;

  // insights
  const insights = items.filter((i) => i.insight);

  const makeIdea = (src: ContentItem) => {
    createItem({
      title: `[Ide dari ${src.id}] ${src.title}`,
      stage: "ideation",
      status: "ide",
      pillar: src.pillar,
      channel: src.channel,
      notes: `Dibuat dari insight konten ${src.id}: "${src.insight}"`,
    });
    alert("Ide baru dibuat di tahap Ideation. Cek Pipeline / Board.");
  };

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-slate-500">
          Hasil & insight. KPI menyesuaikan goal: {config.primaryGoals.map((g) => GOAL_LABELS[g]).join(", ")}.
        </p>
      </header>

      {/* Goal-aware KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total views" value={fmtNum(totalViews)} />
        <StatCard label="Total engagement" value={fmtNum(totalEng)} hint={`eng. rate ${engRate}`} />
        <StatCard label="Reach" value={fmtNum(totalReach)} />
        {sales ? (
          <>
            <StatCard label="Link clicks" value={fmtNum(totalClicks)} />
            <StatCard label="Konversi" value={fmtNum(totalConv)} tone="good" />
          </>
        ) : (
          <StatCard label="Konten dianalisis" value={published.length} />
        )}
      </div>

      <div className="mb-4">
        <FalcoInsights />
      </div>

      {published.length === 0 ? (
        <EmptyState title="Belum ada konten dengan hasil" hint="Isi metrik di tab Hasil pada konten yang sudah tayang." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top / bottom */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">🏆 Top Performer (engagement)</h2>
            <Performers list={top} onClick={ctrl.open} />
            <h2 className="mb-3 mt-5 text-sm font-semibold">📉 Bottom Performer</h2>
            <Performers list={bottom} onClick={ctrl.open} />
          </Card>

          {/* Per pillar / channel */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Performa per Pillar</h2>
            <BarList data={perPillar} />
            <h2 className="mb-3 mt-5 text-sm font-semibold">Performa per Channel</h2>
            <BarList data={perChannel} />
          </Card>
        </div>
      )}

      {/* System health */}
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">⚙️ Kesehatan Sistem</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Cycle time brief→tayang" value={`${avgCycle} hari`} />
          <StatCard label="Revision rate" value={`${revisionRate}%`} tone={revisionRate > 30 ? "bad" : "default"} />
          <StatCard label="On-time rate" value={`${onTimeRate}%`} tone={onTimeRate < 70 ? "warn" : "good"} />
          <StatCard label="Konten tayang" value={tayang.length} />
        </div>
        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase text-slate-500">Beban per PIC (konten aktif)</h3>
        <div className="space-y-1.5">
          {load.map(([id, n]) => {
            const overload = n > avgLoad * 1.5 && n > 2;
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="w-40 truncate text-sm">{memberName(config, id)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${overload ? "bg-red-400" : "bg-indigo-400"}`} style={{ width: `${Math.min(100, (n / (load[0]?.[1] || 1)) * 100)}%` }} />
                </div>
                <span className={`w-8 text-right text-sm ${overload ? "font-semibold text-red-600" : "text-slate-500"}`}>{n}</span>
                {overload && <span className="text-xs text-red-500">overload</span>}
              </div>
            );
          })}
          {load.length === 0 && <p className="text-sm text-slate-400">Tidak ada konten aktif yang ditugaskan.</p>}
        </div>
      </Card>

      {/* Insight loop */}
      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">💡 Insight → Ide (tutup loop)</h2>
        {insights.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada insight. Isi field insight pada konten yang sudah dianalisis.</p>
        ) : (
          <div className="space-y-2">
            {insights.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="text-sm">
                  <span className="font-mono text-xs text-slate-400">{i.id}</span>
                  <p className="text-slate-700">{i.insight}</p>
                </div>
                <button onClick={() => makeIdea(i)} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                  Jadikan ide →
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function groupAgg(items: ContentItem[], key: (i: ContentItem) => string) {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + computeEngagement(i));
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}

function BarList({ data }: { data: [string, number][] }) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  if (data.length === 0) return <p className="text-sm text-slate-400">—</p>;
  return (
    <div className="space-y-1.5">
      {data.map(([label, v]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-28 truncate text-sm text-slate-600">{label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-emerald-400" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="w-12 text-right text-xs text-slate-500">{fmtNum(v)}</span>
        </div>
      ))}
    </div>
  );
}

function Performers({ list, onClick }: { list: ContentItem[]; onClick: (id: string) => void }) {
  if (list.length === 0) return <p className="text-sm text-slate-400">—</p>;
  return (
    <div className="space-y-1.5">
      {list.map((i) => (
        <div key={i.id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50" onClick={() => onClick(i.id)}>
          <span className="truncate text-sm text-slate-700">{i.title}</span>
          <span className="ml-2 shrink-0 text-xs font-medium text-slate-500">{fmtNum(computeEngagement(i))} eng</span>
        </div>
      ))}
    </div>
  );
}
