import type { BrandConfig, ContentItem } from "../types";
import { computeEngagement, fmtNum } from "./helpers";
import { CHANNEL_LABELS, FORMATS, FORMAT_LABELS } from "./constants";

// ============================================================
// Falco — automated social-media analysis engine.
// Implements the Falco analyst frameworks (6-step analysis,
// pattern recognition, anti-generic rules) as deterministic,
// data-grounded computation over the Content Item collection.
// Every statement references real numbers; confidence is labelled
// (KUAT / MODERAT / HIPOTESIS) and small samples are flagged.
// ============================================================

export interface FalcoLine {
  text: string;
  tag?: "RELASIONAL" | "KORELASI" | "HIPOTESIS" | "KUAT" | "MODERAT" | "ANOMALI" | "PELUANG";
}

export interface FalcoRanking {
  metric: string;
  rows: { id: string; title: string; value: string }[];
}

export interface FalcoReport {
  n: number; // analysed (with results)
  totalItems: number;
  warning?: string;
  overview: FalcoLine[];
  rankings: FalcoRanking[];
  patterns: FalcoLine[];
  anomalies: FalcoLine[];
  absences: FalcoLine[];
  conclusions: FalcoLine[];
  recommendations: FalcoLine[];
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
const round1 = (n: number) => Math.round(n * 10) / 10;

function hasResults(i: ContentItem): boolean {
  return Boolean(i.results && ((i.results.views ?? 0) > 0 || computeEngagement(i) > 0));
}

// ----- factor extractors (the dimensions Falco reads patterns from) -----
function hookBucket(i: ContentItem): string {
  const w = i.hook.trim() ? i.hook.trim().split(/\s+/).length : 0;
  if (w === 0) return "tanpa hook";
  if (w <= 8) return "hook pendek (≤8 kata)";
  if (w <= 15) return "hook sedang (9–15 kata)";
  return "hook panjang (>15 kata)";
}

interface Factor {
  label: string;
  get: (i: ContentItem) => string;
}

const FACTORS: Factor[] = [
  { label: "Format", get: (i) => FORMAT_LABELS[i.format] },
  { label: "Pillar", get: (i) => i.pillar },
  { label: "Channel", get: (i) => i.channel.map((c) => CHANNEL_LABELS[c]).join("+") },
  { label: "Tipe konten", get: (i) => i.contentType },
  { label: "Hook", get: hookBucket },
];

function confidence(support: number, sample: number): "KUAT" | "MODERAT" | "HIPOTESIS" {
  if (sample < 5) return "HIPOTESIS";
  const r = support / sample;
  if (r >= 0.8) return "KUAT";
  if (r >= 0.6) return "MODERAT";
  return "HIPOTESIS";
}

export function buildFalcoReport(items: ContentItem[], config: BrandConfig): FalcoReport {
  const analyzed = items.filter(hasResults);
  const n = analyzed.length;

  const report: FalcoReport = {
    n,
    totalItems: items.length,
    overview: [],
    rankings: [],
    patterns: [],
    anomalies: [],
    absences: [],
    conclusions: [],
    recommendations: [],
  };

  if (n === 0) {
    report.warning =
      "Falco tidak menganalisis tanpa data. Isi metrik di tab Hasil pada konten yang sudah tayang, lalu analisis akan muncul di sini.";
    // still surface absence (untapped formats/pillars) from the whole collection
    report.absences = computeAbsences(items, config);
    return report;
  }

  if (n < 5) {
    report.warning = `Sample sangat kecil (${n} konten ber-hasil). Semua temuan di bawah berstatus HIPOTESIS — validasi di periode berikutnya saat data ≥ 30 konten.`;
  } else if (n < 30) {
    report.warning = `Dengan ${n} konten, pattern perlu divalidasi di periode berikutnya (idealnya ≥ 30 konten untuk analisis kuat).`;
  }

  // ---------- Step 1: OVERVIEW ----------
  const totalViews = analyzed.reduce((s, i) => s + (i.results?.views ?? 0), 0);
  const totalEng = analyzed.reduce((s, i) => s + computeEngagement(i), 0);
  const withReach = analyzed.filter((i) => (i.results?.reach ?? 0) > 0);
  const avgER = withReach.length
    ? mean(withReach.map((i) => (computeEngagement(i) / (i.results!.reach ?? 1)) * 100))
    : null;
  report.overview.push({ text: `${n} konten dianalisis (dari ${items.length} total konten).` });
  report.overview.push({
    text: `Total ${fmtNum(totalViews)} views · ${fmtNum(totalEng)} engagement${avgER !== null ? ` · ER rata-rata ${round1(avgER)}%` : ""}.`,
  });
  // Pareto distribution
  const byViews = [...analyzed].filter((i) => (i.results?.views ?? 0) > 0).sort((a, b) => (b.results!.views ?? 0) - (a.results!.views ?? 0));
  if (byViews.length >= 3 && totalViews > 0) {
    let cum = 0;
    let k = 0;
    for (const i of byViews) {
      cum += i.results!.views ?? 0;
      k++;
      if (cum >= totalViews * 0.8) break;
    }
    const pct = Math.round((k / byViews.length) * 100);
    report.overview.push({
      text: `Distribusi Pareto: ${k} konten teratas (${pct}%) menyumbang 80% total views — performa ${pct <= 35 ? "terkonsentrasi di sedikit konten" : "relatif terdistribusi"}.`,
    });
  }

  // ---------- Step 3: RANKING (multi-metrik) ----------
  const topCount = Math.min(3, n);
  const rankMetrics: { metric: string; val: (i: ContentItem) => number; fmt: (i: ContentItem) => string }[] = [
    { metric: "Views", val: (i) => i.results?.views ?? 0, fmt: (i) => `${fmtNum(i.results?.views)} views` },
    { metric: "Engagement", val: (i) => computeEngagement(i), fmt: (i) => `${fmtNum(computeEngagement(i))} eng` },
    { metric: "Shares", val: (i) => i.results?.shares ?? 0, fmt: (i) => `${fmtNum(i.results?.shares)} shares` },
  ];
  for (const rm of rankMetrics) {
    const sorted = [...analyzed].filter((i) => rm.val(i) > 0).sort((a, b) => rm.val(b) - rm.val(a));
    if (sorted.length === 0) continue;
    report.rankings.push({
      metric: rm.metric,
      rows: sorted.slice(0, topCount).map((i) => ({ id: i.id, title: i.title, value: rm.fmt(i) })),
    });
  }

  // ---------- Step 4: PATTERN ANALYSIS ----------
  // top group = top tercile by engagement (min 2)
  const byEng = [...analyzed].sort((a, b) => computeEngagement(b) - computeEngagement(a));
  const topSize = Math.max(2, Math.round(n / 3));
  const topGroup = byEng.slice(0, Math.min(topSize, n));

  // (a) recurring pattern: a factor value shared by most of the top group
  for (const f of FACTORS) {
    const counts = new Map<string, number>();
    for (const i of topGroup) counts.set(f.get(i), (counts.get(f.get(i)) ?? 0) + 1);
    const [val, c] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    if (c >= 2 && c / topGroup.length >= 0.6) {
      report.patterns.push({
        text: `${c} dari ${topGroup.length} konten top punya ${f.label.toLowerCase()} "${val}".`,
        tag: confidence(c, topGroup.length),
      });
    }
  }

  // (b) per-factor average comparison (value vs the rest), strongest first
  const factorFindings: { line: FalcoLine; ratio: number }[] = [];
  for (const f of FACTORS) {
    const groups = new Map<string, number[]>();
    for (const i of analyzed) {
      const v = f.get(i);
      if (!groups.has(v)) groups.set(v, []);
      groups.get(v)!.push(computeEngagement(i));
    }
    if (groups.size < 2) continue;
    const stats = [...groups.entries()].map(([v, arr]) => ({ v, n: arr.length, avg: mean(arr) }));
    stats.sort((a, b) => b.avg - a.avg);
    const best = stats[0];
    const othersAvg = mean(analyzed.filter((i) => f.get(i) !== best.v).map(computeEngagement));
    if (best.avg > 0 && othersAvg > 0) {
      const ratio = best.avg / othersAvg;
      if (ratio >= 1.3) {
        factorFindings.push({
          ratio,
          line: {
            text: `${f.label}: "${best.v}" rata-rata ${fmtNum(Math.round(best.avg))} engagement — ${round1(ratio)}× dibanding ${f.label.toLowerCase()} lain (n=${best.n}). ${mechanism(f.label, best.v)}`,
            tag: best.n >= 3 && n >= 5 ? "KORELASI" : "HIPOTESIS",
          },
        });
      }
    }
  }
  factorFindings.sort((a, b) => b.ratio - a.ratio);
  report.patterns.push(...factorFindings.map((x) => x.line));

  // ---------- Anomaly ----------
  const engVals = analyzed.map(computeEngagement);
  const m = mean(engVals);
  const sd = std(engVals);
  if (sd > 0) {
    for (const i of analyzed) {
      const e = computeEngagement(i);
      if (e > m + 1.5 * sd) {
        report.anomalies.push({
          text: `${i.id} "${i.title}" — ${fmtNum(e)} engagement (${round1(e / (m || 1))}× rata-rata). Outlier: telusuri faktor pembeda lalu uji untuk replikasi.`,
          tag: "ANOMALI",
        });
      }
    }
  }

  // ---------- Absence (peluang) ----------
  report.absences = computeAbsences(items, config);

  // ---------- Step 5 & 6: KESIMPULAN + SARAN ----------
  if (factorFindings.length > 0) {
    const top2 = factorFindings.slice(0, 2);
    for (const ff of top2) {
      report.conclusions.push({ text: ff.line.text, tag: ff.line.tag });
    }
    const best = factorFindings[0].line.text;
    report.recommendations.push({
      text: `Prioritas: perbanyak konten dengan profil pemenang di atas. ${best.split("—")[0].trim()} adalah faktor pembeda terkuat — replikasi & ukur views + share rate.`,
      tag: "KUAT",
    });
  } else {
    report.conclusions.push({
      text: "Belum ada faktor pembeda yang cukup kuat dari data saat ini — perbanyak konten ber-hasil agar pattern bisa terbaca.",
      tag: "HIPOTESIS",
    });
  }
  if (report.absences.length > 0) {
    report.recommendations.push({
      text: `Eksperimen: uji ${report.absences[0].text.replace(/^Belum ada (konten )?/i, "").replace(/\.$/, "")} sebagai blind spot yang belum tergarap.`,
      tag: "PELUANG",
    });
  }
  // posting consistency recommendation (operational, always relevant)
  const weeklyTarget = config.postingTimes.reduce((s, p) => s + p.times.length, 0);
  if (weeklyTarget > 0) {
    report.recommendations.push({
      text: `Jaga konsistensi: target ${weeklyTarget} konten tayang/minggu sesuai jadwal posting brand. Slot kosong = kehilangan reach kumulatif.`,
    });
  }

  return report;
}

// Untapped formats / pillars / channels across the whole collection.
function computeAbsences(items: ContentItem[], config: BrandConfig): FalcoLine[] {
  const out: FalcoLine[] = [];
  const usedFormats = new Set(items.map((i) => i.format));
  const candidateFormats = FORMATS.filter((f) => !usedFormats.has(f));
  if (candidateFormats.length > 0 && items.length > 0) {
    out.push({
      text: `Belum ada konten format ${candidateFormats.slice(0, 3).map((f) => FORMAT_LABELS[f]).join(", ")}.`,
      tag: "PELUANG",
    });
  }
  const usedPillars = new Set(items.map((i) => i.pillar));
  const missingPillars = config.pillars.filter((p) => !usedPillars.has(p.name));
  if (missingPillars.length > 0) {
    out.push({
      text: `Pillar ${missingPillars.map((p) => p.name).join(", ")} belum pernah diproduksi.`,
      tag: "PELUANG",
    });
  }
  const usedChannels = new Set(items.flatMap((i) => i.channel));
  const missingChannels = config.channels.filter((c) => !usedChannels.has(c));
  if (missingChannels.length > 0) {
    out.push({
      text: `Channel ${missingChannels.map((c) => CHANNEL_LABELS[c]).join(", ")} aktif tapi belum ada kontennya.`,
      tag: "PELUANG",
    });
  }
  return out;
}

// Lightweight mechanism hints (the "kenapa" Falco requires per pattern).
function mechanism(factorLabel: string, value: string): string {
  const v = value.toLowerCase();
  if (factorLabel === "Format") {
    if (/reels|short|video|live/.test(v)) return "Mekanisme: durasi/komplesi → algorithm push.";
    if (/carousel/.test(v)) return "Mekanisme: kedalaman → saves → reach ulang.";
  }
  if (factorLabel === "Hook") {
    if (/pendek|tanpa/.test(v)) return "Mekanisme: cepat menangkap perhatian → stop-scroll.";
    return "Mekanisme: perlu divalidasi (korelasi, belum tentu kausal).";
  }
  return "Mekanisme: perlu divalidasi (korelasi, belum tentu kausal).";
}
