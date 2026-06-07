import type { AppState, BrandConfig, ContentItem, ContentResults } from "../types";
import { addDays, nowISO, todayISO } from "./helpers";

export const DEFAULT_CONTENT_ASPECTS: { key: string; label: string }[] = [
  { key: "hookType", label: "Jenis Hook" },
  { key: "talent", label: "Talent" },
  { key: "konsep", label: "Konsep Konten" },
  { key: "heuristik", label: "Heuristic Bias" },
  { key: "sound", label: "Penggunaan Sound" },
  { key: "cta", label: "CTA / TTA" },
  { key: "copyStruktur", label: "Struktur Copywriting" },
  { key: "flow", label: "Content Flow" },
  { key: "topik", label: "Topik Konten" },
];

// 9-person team. Permission tiers: Kean = stakeholder (owner),
// Hany/Yuli/Adit = head & manager, the rest = staff.
const TEAM: BrandConfig["members"] = [
  { id: "u1", name: "Kean", roles: ["lead", "strategist"], active: true, accessLevel: "stakeholder" },
  { id: "u2", name: "Hany", roles: ["strategist", "creative"], active: true, accessLevel: "head" },
  { id: "u3", name: "Yuli", roles: ["creative", "copywriter"], active: true, accessLevel: "manager" },
  { id: "u4", name: "Adit", roles: ["videographer", "editor"], active: true, accessLevel: "manager" },
  { id: "u5", name: "Dep", roles: ["designer"], active: true, accessLevel: "staff" },
  { id: "u6", name: "Tami", roles: ["copywriter"], active: true, accessLevel: "staff" },
  { id: "u7", name: "Yayan", roles: ["editor", "videographer"], active: true, accessLevel: "staff" },
  { id: "u8", name: "Rangga", roles: ["smo", "analyst"], active: true, accessLevel: "staff" },
  { id: "u9", name: "Sasa", roles: ["designer", "kol_coord"], active: true, accessLevel: "staff" },
];

export const defaultConfig: BrandConfig = {
  brandName: "Brand Saya",
  industry: "umum",
  primaryGoals: ["awareness", "engagement"],
  channels: ["instagram", "tiktok", "youtube"],
  members: TEAM.map((m) => ({ ...m })),
  rolesEnabled: [
    "lead", "strategist", "researcher", "creative", "copywriter", "videographer",
    "designer", "editor", "smo", "analyst", "kol_coord", "performance",
  ],
  approvalEnabled: true,
  handoffTrackingEnabled: true, // 9-person team → handoff & My Queue on (per recommendConfig)
  roleBasedViewsEnabled: true,
  bankHealthyMin: 5,
  bankHealthyMax: 10,
  defaultTrendExpiryDays: 14,
  pillars: [
    { name: "Edukasi", description: "Konten tips & how-to seputar produk/industri." },
    { name: "Hiburan", description: "Konten ringan, relatable, tren." },
    { name: "Promosi", description: "Penawaran, produk baru, campaign." },
    { name: "Behind The Scene", description: "Proses, tim, cerita brand." },
  ],
  hashtagSets: [
    { pillar: "Edukasi", tags: ["#tipsharian", "#belajarbareng"] },
    { pillar: "Promosi", tags: ["#promo", "#diskon"] },
  ],
  postingTimes: [
    { channel: "instagram", times: ["07:00", "12:00", "19:00"] },
    { channel: "tiktok", times: ["11:00", "20:00"] },
    { channel: "youtube", times: ["18:00"] },
  ],
  contentAspects: DEFAULT_CONTENT_ASPECTS,
};

function baseItem(partial: Partial<ContentItem>): ContentItem {
  const ts = nowISO();
  return {
    id: "0000-000",
    title: "",
    channel: ["instagram"],
    format: "reels",
    pillar: "Edukasi",
    contentType: "organik",
    stage: "ideation",
    status: "ide",
    priority: "sedang",
    hook: "",
    brief: { objective: "", keyMessage: "", reference: "" },
    copy: "",
    assetLinks: [],
    aspects: {},
    currentPIC: null,
    assignments: {},
    needsApproval: false,
    reviewers: [],
    approvalStatus: "tidak_perlu",
    revisionCount: 0,
    scheduledDate: null,
    isBanked: false,
    notes: "",
    version: 1,
    createdAt: ts,
    updatedAt: ts,
    activityLog: [{ timestamp: ts, user: "system", action: "konten dibuat" }],
    ...partial,
  };
}

function mid(prefixN: number): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}-${String(prefixN).padStart(3, "0")}`;
}

// ============================================================
// Deterministic content generator. Produces a realistic spread
// of published content (with results) so Falco pattern analysis
// has signal. Attributes drive a performance score → metrics,
// so winning/losing patterns are consistent & discoverable.
// ============================================================

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const pick = <T>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const KONSEP = ["interview", "tutorial", "reaction", "GRWM", "storytelling", "review produk", "skit komedi", "hard sell"];
const HOOK_GOOD = ["headline 2 baris + suara teriak", "headline 1 baris", "pertanyaan provokatif", "POV", "ajakan personal", "statistik mengejutkan"];
const TALENTS = ["laki-laki", "perempuan", "duo", "tanpa talent"];
const HEURISTIK = ["pattern interrupt", "social proof", "loss aversion", "cognitive dissonance", "anchoring", "authority bias", "bandwagon"];
const SOUND = ["trending", "voiceover", "original", "tanpa sound"];
const CTA = ["follow", "comment", "save", "share", "link in bio"];
const COPY = ["PAS", "AIDA", "listicle", "storytelling", "naratif singkat"];
const FLOW = ["problem-solution", "step-by-step", "build-up", "myth-busting", "reveal"];
const CHANNEL_SETS: ContentItem["channel"][] = [["instagram"], ["tiktok"], ["instagram", "tiktok"], ["tiktok", "instagram"], ["instagram", "youtube"]];

const KONSEP_PILLAR: Record<string, string> = {
  interview: "Edukasi", tutorial: "Edukasi", "review produk": "Edukasi",
  reaction: "Hiburan", GRWM: "Hiburan", "skit komedi": "Hiburan",
  storytelling: "Behind The Scene", "hard sell": "Promosi",
};
const KONSEP_FORMAT: Record<string, ContentItem["format"]> = {
  interview: "tiktok_video", tutorial: "carousel", reaction: "reels", GRWM: "tiktok_video",
  storytelling: "reels", "review produk": "reels", "skit komedi": "reels", "hard sell": "single_post",
};
const VIDEO_FORMATS = ["reels", "tiktok_video", "short", "yt_short", "long_video"];

function scoreOf(a: Record<string, string>): number {
  let s = 55;
  if (a.konsep === "interview") s += 22;
  else if (a.konsep === "tutorial") s += 8;
  else if (a.konsep === "storytelling") s += 6;
  else if (a.konsep === "reaction") s += 4;
  else if (a.konsep === "hard sell") s -= 32;
  if (a.talent === "laki-laki") s += 9;
  else if (a.talent === "duo") s += 4;
  if (a.sound === "trending") s += 13;
  else if (a.sound === "tanpa sound") s -= 12;
  if (a.heuristik === "pattern interrupt") s += 11;
  else if (a.heuristik === "social proof") s += 6;
  if (a.hookType === "tanpa hook") s -= 26;
  else if (a.hookType.includes("teriak")) s += 9;
  else if (a.hookType === "pertanyaan provokatif" || a.hookType === "POV") s += 7;
  if (a.cta === "save") s += 4;
  return Math.max(8, Math.min(100, s));
}

function makeResults(r: () => number, score: number, isAds: boolean, isVideo: boolean): ContentResults {
  const factor = score / 60;
  const noise = 0.6 + r() * 0.8;
  const views = Math.round(8000 * factor * factor * noise) + 2200;
  const reach = Math.round(views * (0.8 + r() * 0.18));
  const erRate = (score / 100) * 0.09 * (0.7 + r() * 0.6);
  const eng = Math.max(20, Math.round(views * erRate));
  const res: ContentResults = {
    views,
    reach,
    likes: Math.round(eng * 0.66),
    comments: Math.round(eng * 0.09) + 2,
    shares: Math.round(eng * 0.11),
    saves: Math.round(eng * 0.14),
  };
  if (isVideo) {
    res.retention1s = Math.round(Math.min(96, Math.max(12, 45 + score * 0.5 + (r() * 8 - 4))));
    res.retention2s = Math.round(res.retention1s * (0.78 + r() * 0.08));
    res.retention3s = Math.round(res.retention1s * (0.58 + r() * 0.1));
  }
  if (isAds) {
    res.linkClicks = Math.round(views * 0.02 * (0.5 + r()));
    res.conversions = Math.round(res.linkClicks * (0.04 + r() * 0.06));
  }
  return res;
}

function hookLine(hookType: string, topik: string): string {
  switch (hookType) {
    case "pertanyaan provokatif": return `Kamu yakin cara ${topik}-mu udah benar?`;
    case "POV": return `POV: kamu baru sadar soal ${topik}.`;
    case "statistik mengejutkan": return `90% orang salah soal ${topik}.`;
    case "ajakan personal": return `Sini aku kasih tau rahasia ${topik}.`;
    case "tanpa hook": return "";
    default: return `Stop salah soal ${topik}!`;
  }
}

function scriptFor(konsep: string, topik: string, hook: string): string {
  return [
    `Hook: ${hook || "(langsung ke penawaran)"}`,
    `Body: bahas ${topik} dengan format ${konsep}, fokus 1 insight utama.`,
    `Close: ringkas + ajakan aksi.`,
  ].join("\n");
}

function genPublished(prefixN: number, r: () => number, daysAgo: number, topicPool: string[]): ContentItem {
  const konsep = pick(r, KONSEP);
  const topik = pick(r, topicPool);
  const isHardSell = konsep === "hard sell";
  const format = KONSEP_FORMAT[konsep];
  const isVideo = VIDEO_FORMATS.includes(format);
  const talent = isHardSell ? "tanpa talent" : konsep === "GRWM" ? "perempuan" : pick(r, TALENTS);
  const hookType = isHardSell ? (r() < 0.6 ? "tanpa hook" : "headline 1 baris") : pick(r, HOOK_GOOD);
  const sound = isVideo ? (isHardSell ? "tanpa sound" : pick(r, SOUND)) : r() < 0.5 ? "tanpa sound" : "trending";
  const heuristik = isHardSell ? "scarcity" : pick(r, HEURISTIK);
  const cta = isHardSell ? "checkout" : pick(r, CTA);
  const copyStruktur = isHardSell ? "promo" : pick(r, COPY);
  const flow = isHardSell ? "announcement" : pick(r, FLOW);
  const aspects = { hookType, talent, konsep, heuristik, sound, cta, copyStruktur, flow, topik };
  const score = scoreOf(aspects);
  const hook = hookLine(hookType, topik);
  const title = isHardSell ? `PROMO: ${topik}` : `${cap(konsep)}: ${topik}`;
  return baseItem({
    id: mid(prefixN),
    title,
    channel: pick(r, CHANNEL_SETS),
    format,
    pillar: KONSEP_PILLAR[konsep],
    contentType: isHardSell ? "ads" : "organik",
    stage: "analisis",
    status: "dianalisis",
    hook,
    brief: { objective: isHardSell ? "konversi" : "awareness/engagement", keyMessage: title, reference: "moodboard" },
    copy: scriptFor(konsep, topik, hook),
    durationSec: isVideo ? (konsep === "interview" ? 60 + Math.floor(r() * 45) : 15 + Math.floor(r() * 30)) : undefined,
    slideCount: format === "carousel" ? 6 + Math.floor(r() * 6) : undefined,
    aspects,
    scheduledDate: addDays(todayISO(), -daysAgo),
    results: makeResults(r, score, isHardSell, isVideo),
    insight:
      score >= 86 ? "Pola pemenang: konsep + talent + sound + bias saling menguatkan retensi." :
      score <= 28 ? "Underperform: hook lemah / hard-sell tanpa narasi menekan reach organik." : undefined,
  });
}

// Build N published items spread across the last ~`spanDays` days (covers this & last month).
function genPublishedSet(seed: number, fromN: number, count: number, spanDays: number, topics: string[]): ContentItem[] {
  const r = rng(seed);
  const out: ContentItem[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = 1 + ((i * 7 + 3) % spanDays);
    out.push(genPublished(fromN + i, r, daysAgo, topics));
  }
  return out;
}

const SKIN_TOPICS = ["urutan skincare", "sunscreen", "vitamin C", "double cleansing", "serum", "acne", "kulit glowing", "retinol", "moisturizer", "toner", "eksfoliasi", "barrier kulit"];
const FNB_TOPICS = ["menu baru", "kopi susu", "promo bundling", "behind the bar", "resep rahasia", "review pelanggan", "spot foto", "weekend deal"];
const GEN_TOPICS = ["produk unggulan", "tips hemat", "testimoni klien", "cara pakai", "fakta menarik", "Q&A", "update layanan"];

// In-production items across stages — exercises Kanban, handoff/PIC & My Queue.
function pipelineItems(t: string): ContentItem[] {
  return [
    baseItem({ id: mid(47), title: "Interview: tren skincare 2026", channel: ["tiktok", "instagram"], format: "tiktok_video", pillar: "Edukasi", stage: "copywriting", status: "produksi", priority: "tinggi", hook: "2026 semua berubah soal skincare.", brief: { objective: "Edukasi tren", keyMessage: "Antisipasi tren", reference: "riset" }, copy: scriptFor("interview", "tren 2026", "2026 semua berubah."), aspects: { konsep: "interview", talent: "laki-laki" }, currentPIC: "u6", assignments: { copywriting: "u6", take: "u4" }, receivedAt: t, stageDeadline: addDays(t, 2) }),
    baseItem({ id: mid(48), title: "Tutorial: barrier repair routine", format: "carousel", pillar: "Edukasi", stage: "design", status: "produksi", priority: "sedang", hook: "Kulit sensitif? Mulai dari sini.", brief: { objective: "Save-able edukasi", keyMessage: "Barrier dulu", reference: "brief" }, aspects: { konsep: "tutorial", talent: "tanpa talent" }, currentPIC: "u5", assignments: { design: "u5" }, receivedAt: t, stageDeadline: addDays(t, 3) }),
    baseItem({ id: mid(49), title: "Reaction: serum viral TikTok", format: "reels", pillar: "Hiburan", stage: "editing", status: "produksi", priority: "sedang", hook: "Aku coba serum yang lagi viral.", brief: { objective: "Engagement", keyMessage: "Jujur", reference: "tren" }, aspects: { konsep: "reaction", talent: "perempuan" }, currentPIC: "u7", assignments: { editing: "u7" }, receivedAt: t, stageDeadline: addDays(t, -1) }),
    baseItem({ id: mid(50), title: "Storytelling: perjalanan brand 5 tahun", format: "reels", pillar: "Behind The Scene", stage: "take", status: "produksi", priority: "rendah", hook: "Dari garasi sampai sekarang.", brief: { objective: "Brand love", keyMessage: "Autentik", reference: "arsip" }, aspects: { konsep: "storytelling", talent: "duo" }, currentPIC: "u4", assignments: { take: "u4" }, receivedAt: t, stageDeadline: addDays(t, 4) }),
    baseItem({ id: mid(51), title: "GRWM: rutinitas pagi 2 menit", format: "tiktok_video", pillar: "Hiburan", stage: "ideation", status: "ide", priority: "sedang", hook: "Get ready bareng, cepet aja.", brief: { objective: "Relatable", keyMessage: "Praktis", reference: "-" }, aspects: { konsep: "GRWM", talent: "perempuan" }, currentPIC: "u2", assignments: { ideation: "u2" }, receivedAt: t, stageDeadline: addDays(t, 1) }),
    baseItem({ id: mid(52), title: "Tutorial: cara baca label sunscreen", format: "carousel", pillar: "Edukasi", stage: "planning", status: "brief_ok", priority: "tinggi", hook: "SPF doang gak cukup.", brief: { objective: "Edukasi", keyMessage: "PA penting", reference: "riset" }, aspects: { konsep: "tutorial", talent: "tanpa talent" }, currentPIC: "u3", assignments: { planning: "u3" }, receivedAt: t, stageDeadline: addDays(t, 2) }),
    baseItem({ id: mid(53), title: "Review: 3 toner under 100rb", format: "reels", pillar: "Edukasi", stage: "upload", status: "siap", priority: "sedang", hook: "Toner murah tapi works.", brief: { objective: "Konversi halus", keyMessage: "Value", reference: "katalog" }, aspects: { konsep: "review produk", talent: "perempuan" }, currentPIC: "u9", assignments: { upload: "u9" }, receivedAt: t, scheduledDate: addDays(t, 1), stageDeadline: addDays(t, 1) }),
    baseItem({ id: mid(54), title: "Strategy: rencana konten Q3", format: "single_post", pillar: "Behind The Scene", stage: "strategy", status: "ide", priority: "tinggi", hook: "Roadmap kuartal depan.", brief: { objective: "Internal align", keyMessage: "Fokus pillar", reference: "deck" }, currentPIC: "u1", assignments: { strategy: "u1" }, receivedAt: t, stageDeadline: addDays(t, 5) }),
  ];
}

// Pending-approval items (KOL/ads/affiliate) for Approval Inbox demo.
function approvalItems(t: string): ContentItem[] {
  return [
    baseItem({ id: mid(55), title: "GRWM endorse produk baru (KOL)", channel: ["tiktok"], format: "tiktok_video", pillar: "Hiburan", contentType: "kol", stage: "design", status: "review", priority: "tinggi", hook: "Get ready with me pakai produk viral.", brief: { objective: "Awareness lewat KOL", keyMessage: "Cocok harian", reference: "moodboard" }, copy: scriptFor("GRWM", "produk baru", "GRWM pakai produk viral."), durationSec: 42, aspects: { konsep: "GRWM", talent: "perempuan", sound: "trending" }, currentPIC: "u9", assignments: { design: "u9" }, needsApproval: true, reviewers: ["u2"], approvalStatus: "pending", stageDeadline: addDays(t, -1) }),
    baseItem({ id: mid(56), title: "PROMO: bundling hemat 15.6", channel: ["instagram"], format: "single_post", pillar: "Promosi", contentType: "ads", stage: "design", status: "review", priority: "tinggi", hook: "Hemat sampai 40%.", brief: { objective: "Konversi", keyMessage: "Bundling", reference: "katalog" }, aspects: { konsep: "hard sell", heuristik: "scarcity" }, currentPIC: "u6", assignments: { design: "u6" }, needsApproval: true, reviewers: ["u1"], approvalStatus: "pending", stageDeadline: addDays(t, 1) }),
    baseItem({ id: mid(57), title: "Affiliate: link racun serum", channel: ["tiktok", "instagram"], format: "reels", pillar: "Promosi", contentType: "affiliate", stage: "editing", status: "review", priority: "sedang", hook: "Racun check, link di bio.", brief: { objective: "Affiliate sales", keyMessage: "Worth it", reference: "-" }, aspects: { konsep: "review produk", talent: "perempuan" }, currentPIC: "u3", assignments: { editing: "u3" }, needsApproval: true, reviewers: ["u3"], approvalStatus: "pending", stageDeadline: addDays(t, 2) }),
  ];
}

function bankItems(t: string): ContentItem[] {
  return [
    baseItem({ id: mid(58), title: "Reaksi tren sound viral minggu ini", channel: ["tiktok"], format: "tiktok_video", pillar: "Hiburan", stage: "planning", status: "bank", priority: "tinggi", hook: "POV: sound ini lagi di mana-mana.", brief: { objective: "Riding tren", keyMessage: "Relatable", reference: "tren" }, isBanked: true, bankType: "trend", bankedAt: t, expiryDate: addDays(t, 4) }),
    baseItem({ id: mid(59), title: "Challenge skincare 7 hari", channel: ["instagram", "tiktok"], format: "reels", pillar: "Hiburan", stage: "planning", status: "bank", priority: "sedang", hook: "Ikut challenge bareng yuk.", brief: { objective: "Engagement", keyMessage: "Konsisten", reference: "tren" }, isBanked: true, bankType: "trend", bankedAt: t, expiryDate: addDays(t, 9) }),
    baseItem({ id: mid(60), title: "Throwback campaign lebaran", channel: ["instagram"], format: "single_post", pillar: "Hiburan", stage: "planning", status: "bank", priority: "rendah", hook: "Momen kebersamaan yang gak terlupakan.", brief: { objective: "Stok evergreen", keyMessage: "Dekat keluarga", reference: "arsip" }, isBanked: true, bankType: "evergreen", bankedAt: t }),
  ];
}

export function seedItems(): ContentItem[] {
  const t = todayISO();
  // 46 published (May–June) + 8 pipeline + 3 approval + 3 bank = 60
  return [
    ...genPublishedSet(1337, 1, 46, 37, SKIN_TOPICS),
    ...pipelineItems(t),
    ...approvalItems(t),
    ...bankItems(t),
  ];
}

import type { Brand, BrandType, Goal, Industry } from "../types";

function configFor(name: string, industry: Industry, goals: Goal[]): BrandConfig {
  return {
    ...defaultConfig,
    members: TEAM.map((m) => ({ ...m })),
    brandName: name,
    industry,
    primaryGoals: goals,
    contentAspects: DEFAULT_CONTENT_ASPECTS,
  };
}

function makeBrand(
  id: string,
  name: string,
  type: BrandType,
  industry: Industry,
  goals: Goal[],
  items: ContentItem[],
): Brand {
  return { id, type, status: "aktif", config: configFor(name, industry, goals), items };
}

export function seedState(): AppState {
  const brands: Brand[] = [
    // Eksternal — Azarine holds the rich Falco demo (skincare/beauty), ~60 items
    makeBrand("b_azarine", "Azarine", "eksternal", "beauty", ["awareness", "engagement"], seedItems()),
    // Cave (F&B) — 16 published across two months
    makeBrand("b_cave", "Cave Coffee", "eksternal", "fnb", ["awareness", "community"], genPublishedSet(7, 1, 16, 34, FNB_TOPICS)),
    // Wardah (beauty) — newer project, lighter data
    makeBrand("b_wardah", "Wardah", "eksternal", "beauty", ["awareness", "sales"], genPublishedSet(99, 1, 10, 30, SKIN_TOPICS)),
    // Internal
    makeBrand("b_pbk", "PBK", "internal", "umum", ["awareness", "sales"], genPublishedSet(21, 1, 8, 30, GEN_TOPICS)),
    makeBrand("b_nakama", "Nakama Creative Lab", "internal", "tech", ["awareness", "leads"], []),
    makeBrand("b_insightory", "Insightory", "internal", "jasa", ["leads", "community"], []),
  ];
  return {
    brands,
    currentBrandId: "b_azarine",
    currentUserId: "u1",
  };
}
