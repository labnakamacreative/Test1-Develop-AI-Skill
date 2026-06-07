import { useMemo, useState } from "react";
import { buildFalcoReport, generateFalcoMarkdown, type FalcoLine, type PatternGroup, type Tag } from "../lib/falco";
import { useStore } from "../lib/store";
import { download } from "../lib/io";
import { Card } from "./ui";

const TAG_STYLE: Record<Tag, string> = {
  RELASIONAL: "bg-green-100 text-green-700",
  "NON-RELASIONAL": "bg-slate-200 text-slate-500",
  KORELASI: "bg-indigo-100 text-indigo-700",
  HIPOTESIS: "bg-amber-100 text-amber-700",
  KUAT: "bg-green-100 text-green-700",
  ANOMALI: "bg-pink-100 text-pink-700",
  PELUANG: "bg-purple-100 text-purple-700",
};

function TagChip({ tag }: { tag?: Tag }) {
  if (!tag) return null;
  return <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${TAG_STYLE[tag]}`}>{tag}</span>;
}

function Bullet({ line }: { line: FalcoLine }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <span className="mt-1 text-indigo-300">•</span>
      <span className="flex-1">{line.text}<TagChip tag={line.tag} /></span>
    </li>
  );
}

const sel = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

export function FalcoInsights() {
  const { items, config } = useStore();

  // ----- controls -----
  const [period, setPeriod] = useState("all");
  const [topN, setTopN] = useState(3);
  const [patternMetricIds, setPatternMetricIds] = useState<string[]>(["views", "shares", "ret1"]);

  // months present in data
  const months = useMemo(() => {
    const s = new Set<string>();
    for (const i of items) {
      const d = i.scheduledDate ?? i.createdAt;
      if (d) s.add(d.slice(0, 7));
    }
    return Array.from(s).sort().reverse();
  }, [items]);

  const scoped = useMemo(() => {
    const dateOf = (i: typeof items[number]) => (i.scheduledDate ?? i.createdAt ?? "").slice(0, 10);
    if (period === "all") return items;
    if (period === "30d" || period === "90d") {
      const days = period === "30d" ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      return items.filter((i) => dateOf(i) >= cutoff);
    }
    return items.filter((i) => dateOf(i).slice(0, 7) === period);
  }, [items, period]);

  const periodLabel =
    period === "all"
      ? "Semua periode"
      : period === "30d"
        ? "30 hari terakhir"
        : period === "90d"
          ? "90 hari terakhir"
          : new Date(period + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const report = useMemo(
    () => buildFalcoReport(scoped, config, { topN, patternMetricIds, periodLabel }),
    [scoped, config, topN, patternMetricIds, periodLabel],
  );

  const toggleMetric = (id: string) =>
    setPatternMetricIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const exportMd = () => {
    download(`falco-analisis-${period}-${new Date().toISOString().slice(0, 10)}.md`, generateFalcoMarkdown(report), "text/markdown");
  };

  const topGroups = report.patternGroups.filter((g) => g.kind === "top");
  const worstGroups = report.patternGroups.filter((g) => g.kind === "worst");

  return (
    <Card className="p-4">
      {/* header + controls */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">🦅 Analisis Falco — Insight Otomatis</h2>
          <p className="text-xs text-slate-400">Kerangka 6-step (Overview → Top&Worst → Pattern → Kesimpulan → Saran), data-driven & anti-generik.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={sel} value={period} onChange={(e) => setPeriod(e.target.value)} title="Periode">
            <option value="all">📅 Semua periode</option>
            <option value="30d">30 hari terakhir</option>
            <option value="90d">90 hari terakhir</option>
            {months.length > 0 && (
              <optgroup label="Per bulan">
                {months.map((m) => (
                  <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</option>
                ))}
              </optgroup>
            )}
          </select>
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-sm">
            {[3, 5].map((nn) => (
              <button key={nn} className={`rounded px-2.5 py-1 ${topN === nn ? "bg-indigo-600 text-white" : "text-slate-600"}`} onClick={() => setTopN(nn)}>
                Top/Worst {nn}
              </button>
            ))}
          </div>
          <button className={`${sel} text-indigo-600`} onClick={exportMd}>⬇ Export .md</button>
        </div>
      </div>

      {report.warning && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">⚠️ {report.warning}</div>
      )}

      {/* legend */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
        <span>Label faktor:</span>
        {(["RELASIONAL", "NON-RELASIONAL", "KORELASI", "HIPOTESIS", "ANOMALI", "PELUANG"] as Tag[]).map((t) => (
          <span key={t} className={`rounded px-1.5 py-0.5 font-semibold ${TAG_STYLE[t]}`}>{t}</span>
        ))}
      </div>

      {/* OVERVIEW */}
      <Section title="1 · Overview">
        <ul className="space-y-1.5">{report.overview.map((l, i) => <Bullet key={i} line={l} />)}</ul>
      </Section>

      {/* RANKING */}
      {report.rankings.length > 0 && (
        <Section title={`2 · Top & Worst ${topN} (per metrik)`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.rankings.map((r) => (
              <div key={r.metricId} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-1.5 text-xs font-semibold text-slate-700">{r.metricLabel}</div>
                <div className="text-[11px] font-medium text-green-600">Top</div>
                <ol className="mb-2 ml-4 list-decimal text-xs text-slate-600">
                  {r.top.map((x) => <li key={x.id} className="truncate" title={x.title}><span className="font-mono text-[9px] text-slate-400">{x.id}</span> {x.title} — {x.value}</li>)}
                </ol>
                <div className="text-[11px] font-medium text-red-500">Worst</div>
                <ol className="ml-4 list-decimal text-xs text-slate-600">
                  {r.worst.map((x) => <li key={x.id} className="truncate" title={x.title}><span className="font-mono text-[9px] text-slate-400">{x.id}</span> {x.title} — {x.value}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* PATTERN ANALYSIS */}
      <Section title="3 · Pattern Analysis">
        {report.availableMetrics.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400">Metrik pattern:</span>
            {report.availableMetrics.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMetric(m.id)}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${patternMetricIds.includes(m.id) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-500"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        {report.patternGroups.length === 0 ? (
          <p className="text-sm text-slate-400">Pilih minimal satu metrik pattern, dan pastikan ada data hasil + aspek konten.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase text-green-600">Top groups</div>
              {topGroups.map((g) => <PatternCard key={g.key} g={g} accent="green" />)}
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase text-red-500">Worst groups</div>
              {worstGroups.map((g) => <PatternCard key={g.key} g={g} accent="red" />)}
            </div>
          </div>
        )}
      </Section>

      {/* KESIMPULAN */}
      <Section title="4 · Kesimpulan (benang merah)">
        <ul className="space-y-1.5">{report.conclusions.map((l, i) => <Bullet key={i} line={l} />)}</ul>
      </Section>

      {/* SARAN */}
      <Section title="5 · Saran">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Based on Data</div>
            <ul className="space-y-1.5">{report.recommendationsData.map((l, i) => <Bullet key={i} line={l} />)}</ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">Eksploratif</div>
            <ul className="space-y-1.5">{report.recommendationsExplore.map((l, i) => <Bullet key={i} line={l} />)}</ul>
          </div>
        </div>
      </Section>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function PatternCard({ g, accent }: { g: PatternGroup; accent: "green" | "red" }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-lg border p-3 ${accent === "green" ? "border-green-200" : "border-red-200"}`}>
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <span className="text-sm font-semibold text-slate-700">{g.key}</span>
        <span className="text-xs text-slate-400">{g.members.map((m) => m.id).join(", ")} {open ? "▲" : "▼"}</span>
      </button>
      {open && (
        g.lines.length ? (
          <ul className="mt-2 space-y-1.5">{g.lines.map((l: FalcoLine, i: number) => <Bullet key={i} line={l} />)}</ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Belum cukup data aspek untuk membaca pola di grup ini.</p>
        )
      )}
    </div>
  );
}
