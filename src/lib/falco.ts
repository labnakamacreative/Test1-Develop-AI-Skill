import type { BrandConfig, ContentItem } from "../types";
import { computeEngagement, fmtNum } from "./helpers";
import { CHANNEL_LABELS, FORMAT_LABELS } from "./constants";

// ============================================================
// Falco — automated social-media analysis engine.
// Implements the NCL/Falco framework: Overview → Top&Worst →
// Pattern Analysis (per metric grouping, per content aspect) →
// Kesimpulan → Saran. Every statement is data-grounded; factors
// are labelled RELASIONAL / NON-RELASIONAL / HIPOTESIS.
// ============================================================

export type Tag =
  | "RELASIONAL"
  | "NON-RELASIONAL"
  | "KORELASI"
  | "HIPOTESIS"
  | "KUAT"
  | "ANOMALI"
  | "PELUANG";

export interface FalcoLine {
  text: string;
  tag?: Tag;
}

export interface RankRow {
  id: string;
  title: string;
  value: string;
}

export interface MetricRanking {
  metricId: string;
  metricLabel: string;
  top: RankRow[];
  worst: RankRow[];
}

export interface PatternGroup {
  key: string; // "Top 3 by Views"
  kind: "top" | "worst";
  metricLabel: string;
  members: { id: string; title: string }[];
  lines: FalcoLine[];
}

export interface FalcoReport {
  n: number;
  totalItems: number;
  topN: number;
  periodLabel: string;
  warning?: string;
  overview: FalcoLine[];
  rankings: MetricRanking[];
  patternGroups: PatternGroup[];
  conclusions: FalcoLine[];
  recommendationsData: FalcoLine[];
  recommendationsExplore: FalcoLine[];
  availableMetrics: { id: string; label: string }[];
}

export interface FalcoOptions {
  topN: number; // 3 or 5
  patternMetricIds: string[];
  periodLabel: string;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

// ----- metric definitions -----
interface Metric {
  id: string;
  label: string;
  get: (i: ContentItem) => number | undefined;
  fmt: (v: number) => string;
}

const METRICS: Metric[] = [
  { id: "views", label: "Views", get: (i) => i.results?.views, fmt: (v) => `${fmtNum(v)} views` },
  { id: "likes", label: "Likes", get: (i) => i.results?.likes, fmt: (v) => `${fmtNum(v)} likes` },
  { id: "comments", label: "Comments", get: (i) => i.results?.comments, fmt: (v) => `${fmtNum(v)} comments` },
  { id: "shares", label: "Shares", get: (i) => i.results?.shares, fmt: (v) => `${fmtNum(v)} shares` },
  { id: "saves", label: "Saves", get: (i) => i.results?.saves, fmt: (v) => `${fmtNum(v)} saves` },
  {
    id: "er",
    label: "Engagement Rate",
    get: (i) => ((i.results?.reach ?? 0) > 0 ? (computeEngagement(i) / (i.results!.reach as number)) * 100 : undefined),
    fmt: (v) => `${round1(v)}% ER`,
  },
  { id: "ret1", label: "Retention @1s", get: (i) => i.results?.retention1s, fmt: (v) => `${round1(v)}% ret@1s` },
];

// ----- aspect dimensions (built-in + brand-configured) -----
interface Dim {
  key: string;
  label: string;
  get: (i: ContentItem) => string | undefined;
}

function durBucket(s?: number): string | undefined {
  if (!s || s <= 0) return undefined;
  if (s <= 15) return "≤15 detik";
  if (s <= 30) return "16–30 detik";
  if (s <= 60) return "31–60 detik";
  return ">60 detik";
}
function slideBucket(s?: number): string | undefined {
  if (!s || s <= 0) return undefined;
  if (s <= 5) return "≤5 slide";
  if (s <= 8) return "6–8 slide";
  return ">8 slide";
}
function hookLenBucket(h: string): string | undefined {
  const w = h.trim() ? h.trim().split(/\s+/).length : 0;
  if (w === 0) return "tanpa hook";
  if (w <= 8) return "hook pendek (≤8 kata)";
  if (w <= 15) return "hook sedang (9–15 kata)";
  return "hook panjang (>15 kata)";
}

function dimensions(config: BrandConfig): Dim[] {
  const builtins: Dim[] = [
    { key: "format", label: "Format", get: (i) => FORMAT_LABELS[i.format] },
    { key: "platform", label: "Platform", get: (i) => i.channel.map((c) => CHANNEL_LABELS[c]).join("+") },
    { key: "contentType", label: "Tipe konten", get: (i) => i.contentType },
    { key: "pillar", label: "Pillar", get: (i) => i.pillar },
    { key: "durasi", label: "Durasi", get: (i) => durBucket(i.durationSec) },
    { key: "slide", label: "Jumlah slide", get: (i) => slideBucket(i.slideCount) },
    { key: "hookLen", label: "Panjang hook", get: (i) => hookLenBucket(i.hook) },
  ];
  const configured: Dim[] = (config.contentAspects ?? []).map((a) => ({
    key: `aspect_${a.key}`,
    label: a.label,
    get: (i: ContentItem) => i.aspects?.[a.key] || undefined,
  }));
  return [...builtins, ...configured];
}

function mode(vals: string[]): { value: string; count: number } | null {
  if (!vals.length) return null;
  const m = new Map<string, number>();
  for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
  let value = "";
  let count = 0;
  for (const [v, n] of m) if (n > count) { value = v; count = n; }
  return { value, count };
}

function hasResults(i: ContentItem): boolean {
  return Boolean(i.results && ((i.results.views ?? 0) > 0 || computeEngagement(i) > 0 || (i.results.retention1s ?? 0) > 0));
}

export function buildFalcoReport(items: ContentItem[], config: BrandConfig, opts: FalcoOptions): FalcoReport {
  const analyzed = items.filter(hasResults);
  const n = analyzed.length;
  const dims = dimensions(config);

  const report: FalcoReport = {
    n,
    totalItems: items.length,
    topN: opts.topN,
    periodLabel: opts.periodLabel,
    overview: [],
    rankings: [],
    patternGroups: [],
    conclusions: [],
    recommendationsData: [],
    recommendationsExplore: [],
    availableMetrics: [],
  };

  // available metrics (≥2 items with a value)
  const available = METRICS.filter((m) => analyzed.filter((i) => (m.get(i) ?? 0) > 0).length >= 2);
  report.availableMetrics = available.map((m) => ({ id: m.id, label: m.label }));

  if (n === 0) {
    report.warning = "Falco tidak menganalisis tanpa data. Isi metrik (tab Hasil) pada konten yang sudah tayang.";
    report.recommendationsExplore = computeAbsences(items, config);
    return report;
  }
  if (n < 5) {
    report.warning = `Sample kecil (${n} konten). Pattern berstatus HIPOTESIS — validasi saat data ≥ 30 konten (standar Falco).`;
  } else if (n < 30) {
    report.warning = `Dengan ${n} konten, pattern perlu validasi periode berikutnya (idealnya ≥ 30 konten).`;
  }

  // ---------- OVERVIEW ----------
  const totalViews = analyzed.reduce((s, i) => s + (i.results?.views ?? 0), 0);
  const totalEng = analyzed.reduce((s, i) => s + computeEngagement(i), 0);
  const withReach = analyzed.filter((i) => (i.results?.reach ?? 0) > 0);
  const avgER = withReach.length ? mean(withReach.map((i) => (computeEngagement(i) / (i.results!.reach as number)) * 100)) : null;
  const withRet = analyzed.filter((i) => (i.results?.retention1s ?? 0) > 0);
  const avgRet = withRet.length ? mean(withRet.map((i) => i.results!.retention1s as number)) : null;
  report.overview.push({ text: `${n} konten ber-hasil dianalisis (dari ${items.length} total) — periode: ${opts.periodLabel}.` });
  report.overview.push({
    text: `Total ${fmtNum(totalViews)} views · ${fmtNum(totalEng)} engagement${avgER !== null ? ` · ER rata-rata ${round1(avgER)}%` : ""}${avgRet !== null ? ` · retention@1s rata-rata ${round1(avgRet)}%` : ""}.`,
  });
  // Pareto
  const byViews = analyzed.filter((i) => (i.results?.views ?? 0) > 0).sort((a, b) => (b.results!.views ?? 0) - (a.results!.views ?? 0));
  if (byViews.length >= 3 && totalViews > 0) {
    let cum = 0, k = 0;
    for (const i of byViews) { cum += i.results!.views ?? 0; k++; if (cum >= totalViews * 0.8) break; }
    const pct = Math.round((k / byViews.length) * 100);
    report.overview.push({ text: `Distribusi Pareto: ${k} konten teratas (${pct}%) menyumbang 80% total views — ${pct <= 35 ? "performa terkonsentrasi di sedikit konten" : "relatif terdistribusi"}.` });
  }

  // ---------- RANKING (semua metrik tersedia) ----------
  const topN = opts.topN;
  for (const m of available) {
    const sorted = analyzed.filter((i) => (m.get(i) ?? 0) > 0).sort((a, b) => (m.get(b) as number) - (m.get(a) as number));
    if (sorted.length < 2) continue;
    report.rankings.push({
      metricId: m.id,
      metricLabel: m.label,
      top: sorted.slice(0, topN).map((i) => ({ id: i.id, title: i.title, value: m.fmt(m.get(i) as number) })),
      worst: sorted.slice(-topN).reverse().map((i) => ({ id: i.id, title: i.title, value: m.fmt(m.get(i) as number) })),
    });
  }

  // ---------- PATTERN ANALYSIS ----------
  const patternMetrics = available.filter((m) => opts.patternMetricIds.includes(m.id));
  // pre-compute dominant top/worst value per metric per dimension (for relational tagging)
  const groupMembers = (m: Metric, kind: "top" | "worst") => {
    const sorted = analyzed.filter((i) => (m.get(i) ?? 0) > 0).sort((a, b) => (m.get(b) as number) - (m.get(a) as number));
    return kind === "top" ? sorted.slice(0, topN) : sorted.slice(-topN).reverse();
  };
  const domOf = (members: ContentItem[], d: Dim) => mode(members.map(d.get).filter((x): x is string => Boolean(x)));

  for (const m of patternMetrics) {
    for (const kind of ["top", "worst"] as const) {
      const members = groupMembers(m, kind);
      if (members.length === 0) continue;
      const counterpart = groupMembers(m, kind === "top" ? "worst" : "top");
      const groupLabel = `${kind === "top" ? "Top" : "Worst"} ${members.length} by ${m.label}`;
      const lines: FalcoLine[] = [];
      for (const d of dims) {
        const vals = members.map(d.get).filter((x): x is string => Boolean(x));
        const dom = mode(vals);
        if (!dom || vals.length < 2) continue; // need ≥2 with data to call a pattern
        const counter = domOf(counterpart, d);
        let tag: Tag;
        if (n < 5) tag = "HIPOTESIS";
        else if (counter && counter.value === dom.value) tag = "NON-RELASIONAL";
        else if (counter && counter.value !== dom.value && dom.count / vals.length >= 0.6) tag = "RELASIONAL";
        else tag = "KORELASI";
        lines.push({
          text: `${dom.count} dari ${vals.length} ${groupLabel} — dari segi ${d.label}: "${dom.value}".`,
          tag,
        });
      }
      report.patternGroups.push({
        key: groupLabel,
        kind,
        metricLabel: m.label,
        members: members.map((i) => ({ id: i.id, title: i.title })),
        lines,
      });
    }
  }

  // ---------- KESIMPULAN (benang merah) ----------
  // For each dimension, compare top vs worst on the primary metric (first pattern metric, else views)
  const primary = patternMetrics[0] ?? available[0];
  if (primary) {
    const top = groupMembers(primary, "top");
    const worst = groupMembers(primary, "worst");
    const relational: FalcoLine[] = [];
    const nonRelational: FalcoLine[] = [];
    for (const d of dims) {
      const dt = domOf(top, d);
      const dw = domOf(worst, d);
      if (!dt) continue;
      if (dw && dt.value !== dw.value) {
        relational.push({
          text: `${d.label}: top "${dt.value}" vs worst "${dw.value}" → faktor pembeda. ${mechanism(d.key, dt.value)}`,
          tag: n < 5 ? "HIPOTESIS" : "RELASIONAL",
        });
      } else if (dw && dt.value === dw.value) {
        nonRelational.push({
          text: `${d.label}: top & worst sama-sama "${dt.value}" → bukan pembeda performa.`,
          tag: "NON-RELASIONAL",
        });
      }
    }
    report.conclusions.push(...relational.slice(0, 9));
    report.conclusions.push(...nonRelational.slice(0, 3));
  }
  // anomalies
  const engVals = analyzed.map(computeEngagement);
  const m0 = mean(engVals);
  const sd = Math.sqrt(mean(engVals.map((x) => (x - m0) ** 2)));
  if (sd > 0) {
    for (const i of analyzed) {
      const e = computeEngagement(i);
      if (e > m0 + 1.5 * sd) {
        report.conclusions.push({ text: `Anomali ${i.id} "${i.title}": ${fmtNum(e)} engagement (${round1(e / (m0 || 1))}× rata-rata) — telusuri & uji replikasi.`, tag: "ANOMALI" });
      }
    }
  }
  if (report.conclusions.length === 0) {
    report.conclusions.push({ text: "Belum ada faktor pembeda yang cukup kuat — lengkapi aspek konten & perbanyak data ber-hasil.", tag: "HIPOTESIS" });
  }

  // ---------- SARAN ----------
  if (primary) {
    const top = groupMembers(primary, "top");
    const worst = groupMembers(primary, "worst");
    let added = 0;
    for (const d of dims) {
      if (added >= 5) break;
      const dt = domOf(top, d);
      const dw = domOf(worst, d);
      if (dt && dw && dt.value !== dw.value && dt.count >= 2) {
        report.recommendationsData.push({
          text: `Perbanyak konten dengan ${d.label.toLowerCase()} "${dt.value}" (dominan di top by ${primary.label}); kurangi "${dw.value}" yang dominan di worst.`,
          tag: n < 5 ? "HIPOTESIS" : "KUAT",
        });
        added++;
      }
    }
    if (added === 0) {
      report.recommendationsData.push({ text: "Lengkapi aspek konten (talent, konsep, hook type, dll) agar saran berbasis pembeda bisa dihasilkan.", tag: "HIPOTESIS" });
    }
  }
  // exploratory = absences + combo experiment
  report.recommendationsExplore = computeAbsences(items, config);
  if (primary) {
    const top = groupMembers(primary, "top");
    const combo = dims.map((d) => domOf(top, d)).filter(Boolean).slice(0, 3).map((x, idx) => `${dims[idx].label.toLowerCase()} "${x!.value}"`);
    if (combo.length >= 2) {
      report.recommendationsExplore.push({ text: `Uji winning-combo secara terisolasi: ${combo.join(" + ")} dalam 3–4 konten berikutnya, lalu ukur views & retention.`, tag: "PELUANG" });
    }
  }

  return report;
}

function computeAbsences(items: ContentItem[], config: BrandConfig): FalcoLine[] {
  const out: FalcoLine[] = [];
  const usedPillars = new Set(items.map((i) => i.pillar));
  const missingPillars = config.pillars.filter((p) => !usedPillars.has(p.name));
  if (missingPillars.length > 0) out.push({ text: `Pillar ${missingPillars.map((p) => p.name).join(", ")} belum pernah diproduksi — peluang konten baru.`, tag: "PELUANG" });
  const usedChannels = new Set(items.flatMap((i) => i.channel));
  const missingChannels = config.channels.filter((c) => !usedChannels.has(c));
  if (missingChannels.length > 0) out.push({ text: `Channel ${missingChannels.map((c) => CHANNEL_LABELS[c]).join(", ")} aktif tapi belum ada kontennya.`, tag: "PELUANG" });
  // untapped aspect values across the collection
  for (const a of config.contentAspects ?? []) {
    const filled = items.filter((i) => i.aspects?.[a.key]).length;
    if (filled === 0) out.push({ text: `Aspek "${a.label}" belum pernah diisi — lengkapi agar Falco bisa membaca polanya.`, tag: "PELUANG" });
  }
  return out.slice(0, 6);
}

function mechanism(dimKey: string, value: string): string {
  const v = value.toLowerCase();
  if (dimKey === "format") {
    if (/reels|short|video|live|tiktok/.test(v)) return "Mekanisme: durasi/komplesi → algorithm push.";
    if (/carousel/.test(v)) return "Mekanisme: kedalaman → saves → reach ulang.";
  }
  if (dimKey === "durasi") return "Mekanisme: durasi memengaruhi completion → distribusi.";
  if (dimKey === "hookLen" || dimKey === "aspect_hookType") return "Mekanisme: hook menentukan stop-scroll di 3 detik pertama.";
  if (dimKey === "aspect_sound") return "Mekanisme: trending sound → boost distribusi algoritma.";
  if (dimKey === "aspect_talent") return "Mekanisme: talent → koneksi personal & trust.";
  if (dimKey === "aspect_heuristik") return "Mekanisme: bias psikologis → daya tarik perhatian.";
  return "Mekanisme: perlu divalidasi (korelasi, belum tentu kausal).";
}

// ----- Markdown report (mengikuti kerangka NCL) -----
export function generateFalcoMarkdown(report: FalcoReport): string {
  const L = (lines: FalcoLine[]) => lines.map((l) => `- ${l.text}${l.tag ? ` _(${l.tag})_` : ""}`).join("\n");
  const parts: string[] = [];
  parts.push(`# Social Media Performance Analysis — Falco`);
  parts.push(`**Periode:** ${report.periodLabel} · **Konten dianalisis:** ${report.n}/${report.totalItems} · **Top/Worst N:** ${report.topN}`);
  if (report.warning) parts.push(`> ⚠️ ${report.warning}`);

  parts.push(`\n## Overview\n${L(report.overview)}`);

  parts.push(`\n## Top & Worst`);
  for (const r of report.rankings) {
    parts.push(`\n### ${r.metricLabel}`);
    parts.push(`**Top ${r.top.length}:**\n${r.top.map((x, i) => `${i + 1}. ${x.id} — ${x.title} (${x.value})`).join("\n")}`);
    parts.push(`**Worst ${r.worst.length}:**\n${r.worst.map((x, i) => `${i + 1}. ${x.id} — ${x.title} (${x.value})`).join("\n")}`);
  }

  parts.push(`\n## Pattern Analysis`);
  for (const g of report.patternGroups) {
    parts.push(`\n### Pattern — ${g.key}`);
    parts.push(`Konten: ${g.members.map((m) => m.id).join(", ")}`);
    parts.push(g.lines.length ? L(g.lines) : "_Belum cukup data aspek untuk membaca pola di grup ini._");
  }

  parts.push(`\n## Kesimpulan\n${L(report.conclusions)}`);

  parts.push(`\n## Saran`);
  parts.push(`\n### Saran Based on Data\n${L(report.recommendationsData)}`);
  parts.push(`\n### Saran Eksploratif\n${L(report.recommendationsExplore)}`);

  return parts.join("\n");
}
