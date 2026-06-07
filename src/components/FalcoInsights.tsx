import { useMemo } from "react";
import { buildFalcoReport, type FalcoLine } from "../lib/falco";
import { useStore } from "../lib/store";
import { Card } from "./ui";

const TAG_STYLE: Record<string, string> = {
  KUAT: "bg-green-100 text-green-700",
  MODERAT: "bg-sky-100 text-sky-700",
  KORELASI: "bg-indigo-100 text-indigo-700",
  RELASIONAL: "bg-indigo-100 text-indigo-700",
  HIPOTESIS: "bg-amber-100 text-amber-700",
  ANOMALI: "bg-pink-100 text-pink-700",
  PELUANG: "bg-purple-100 text-purple-700",
};

function Line({ line }: { line: FalcoLine }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-700">
      <span className="mt-1 text-indigo-400">•</span>
      <span className="flex-1">
        {line.text}
        {line.tag && (
          <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${TAG_STYLE[line.tag] ?? "bg-slate-100 text-slate-600"}`}>
            {line.tag}
          </span>
        )}
      </span>
    </li>
  );
}

function Section({ title, lines }: { title: string; lines: FalcoLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <ul className="space-y-1.5">
        {lines.map((l, i) => <Line key={i} line={l} />)}
      </ul>
    </div>
  );
}

export function FalcoInsights() {
  const { items, config } = useStore();
  const report = useMemo(() => buildFalcoReport(items, config), [items, config]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">🦅 Insight Otomatis — Falco</h2>
          <p className="text-xs text-slate-400">
            Analisis 6-step berbasis data ({report.n} konten ber-hasil). Label: KUAT/MODERAT = pattern; KORELASI/HIPOTESIS = perlu validasi.
          </p>
        </div>
      </div>

      {report.warning && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          ⚠️ {report.warning}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Section title="Overview" lines={report.overview} />
          <Section title="Pattern" lines={report.patterns} />
          <Section title="Anomali" lines={report.anomalies} />
        </div>
        <div className="space-y-4">
          {report.rankings.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Ranking</h3>
              <div className="space-y-2">
                {report.rankings.map((r) => (
                  <div key={r.metric}>
                    <div className="text-xs font-medium text-slate-600">Top by {r.metric}</div>
                    <ol className="ml-4 list-decimal text-sm text-slate-700">
                      {r.rows.map((row) => (
                        <li key={row.id} className="truncate">
                          <span className="font-mono text-[10px] text-slate-400">{row.id}</span> {row.title} — <span className="text-slate-500">{row.value}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Section title="Peluang (Absence)" lines={report.absences} />
          <Section title="Kesimpulan" lines={report.conclusions} />
          <Section title="Saran" lines={report.recommendations} />
        </div>
      </div>
    </Card>
  );
}
