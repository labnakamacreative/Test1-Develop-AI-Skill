import type { AppState, BrandConfig, ContentItem } from "../types";
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

export const defaultConfig: BrandConfig = {
  brandName: "Brand Saya",
  industry: "umum",
  primaryGoals: ["awareness", "engagement"],
  channels: ["instagram", "tiktok", "youtube"],
  members: [
    { id: "u1", name: "Andi (Lead)", roles: ["lead", "strategist"], active: true },
    { id: "u2", name: "Bella (Creative)", roles: ["creative", "copywriter"], active: true },
    { id: "u3", name: "Citra (Designer)", roles: ["designer", "editor"], active: true },
    { id: "u4", name: "Dani (SMO)", roles: ["smo", "analyst"], active: true },
  ],
  rolesEnabled: ["lead", "strategist", "creative", "copywriter", "designer", "editor", "smo", "analyst"],
  approvalEnabled: true,
  handoffTrackingEnabled: false,
  roleBasedViewsEnabled: false,
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

function mid(n: number): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}-${String(n).padStart(3, "0")}`;
}

// A published, fully-measured content item (analysed by Falco).
function published(
  n: number,
  o: {
    title: string;
    channel?: ContentItem["channel"];
    format: ContentItem["format"];
    pillar: string;
    contentType?: ContentItem["contentType"];
    hook: string;
    daysAgo: number;
    durationSec?: number;
    slideCount?: number;
    aspects: Record<string, string>;
    r: NonNullable<ContentItem["results"]>;
    insight?: string;
  },
): ContentItem {
  const t = addDays(todayISO(), -o.daysAgo);
  return baseItem({
    id: mid(n),
    title: o.title,
    channel: o.channel ?? ["instagram"],
    format: o.format,
    pillar: o.pillar,
    contentType: o.contentType ?? "organik",
    stage: "analisis",
    status: "dianalisis",
    hook: o.hook,
    brief: { objective: "tercatat", keyMessage: o.title, reference: "-" },
    durationSec: o.durationSec,
    slideCount: o.slideCount,
    aspects: o.aspects,
    scheduledDate: t,
    results: o.r,
    insight: o.insight,
  });
}

export function seedItems(): ContentItem[] {
  const t = todayISO();
  return [
    // ---- High performers: interview + male talent + >60s + pattern interrupt + trending sound
    published(1, {
      title: "Interview: rahasia konsisten skincare 5 tahun",
      channel: ["tiktok", "instagram"],
      format: "tiktok_video",
      pillar: "Edukasi",
      hook: "Kamu salah selama ini soal urutan skincare.",
      daysAgo: 5,
      durationSec: 78,
      aspects: { hookType: "headline 2 baris + suara teriak", talent: "laki-laki", konsep: "interview", heuristik: "pattern interrupt", sound: "trending", cta: "follow", copyStruktur: "PAS", flow: "problem-solution", topik: "rutinitas skincare" },
      r: { views: 312000, likes: 18400, comments: 1320, shares: 5400, saves: 7200, reach: 280000, retention1s: 92, retention2s: 81, retention3s: 70 },
      insight: "Interview format dengan talent pria + hook teriak konsisten dapat retensi tinggi.",
    }),
    published(2, {
      title: "Interview dokter: mitos vitamin C",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Edukasi",
      hook: "Dokter ini bongkar kebohongan industri.",
      daysAgo: 9,
      durationSec: 95,
      aspects: { hookType: "headline 2 baris + suara teriak", talent: "laki-laki", konsep: "interview", heuristik: "cognitive dissonance", sound: "trending", cta: "comment", copyStruktur: "PAS", flow: "myth-busting", topik: "vitamin C" },
      r: { views: 268000, likes: 15200, comments: 2100, shares: 6100, saves: 4300, reach: 240000, retention1s: 89, retention2s: 76, retention3s: 64 },
    }),
    published(3, {
      title: "Interview founder: kenapa produk lokal mahal",
      channel: ["instagram", "youtube"],
      format: "reels",
      pillar: "Behind The Scene",
      hook: "Harga segini bukan buat untung gede.",
      daysAgo: 13,
      durationSec: 65,
      aspects: { hookType: "pertanyaan provokatif", talent: "laki-laki", konsep: "interview", heuristik: "pattern interrupt", sound: "voiceover", cta: "save", copyStruktur: "storytelling", flow: "reveal", topik: "harga produk" },
      r: { views: 198000, likes: 11200, comments: 980, shares: 3900, saves: 6100, reach: 175000, retention1s: 85, retention2s: 71, retention3s: 58 },
    }),
    // ---- Mid: carousel edukasi, save-able
    published(4, {
      title: "5 langkah double cleansing yang benar",
      channel: ["instagram"],
      format: "carousel",
      pillar: "Edukasi",
      hook: "Cuci muka 2x bukan berarti kulit bersih.",
      daysAgo: 6,
      slideCount: 8,
      aspects: { hookType: "headline 1 baris", talent: "tanpa talent", konsep: "tutorial", heuristik: "loss aversion", sound: "tanpa sound", cta: "save", copyStruktur: "listicle", flow: "step-by-step", topik: "cleansing" },
      r: { views: 84000, likes: 6200, comments: 410, shares: 1800, saves: 9100, reach: 79000, retention1s: 0 },
      insight: "Carousel tutorial dapat save rate tinggi walau views sedang.",
    }),
    published(5, {
      title: "Checklist memilih sunscreen sesuai kulit",
      channel: ["instagram"],
      format: "carousel",
      pillar: "Edukasi",
      hook: "Sunscreen-mu mungkin bikin kusam.",
      daysAgo: 11,
      slideCount: 10,
      aspects: { hookType: "headline 1 baris", talent: "tanpa talent", konsep: "tutorial", heuristik: "loss aversion", sound: "tanpa sound", cta: "save", copyStruktur: "listicle", flow: "checklist", topik: "sunscreen" },
      r: { views: 76000, likes: 5400, comments: 320, shares: 1500, saves: 8200, reach: 71000, retention1s: 0 },
    }),
    // ---- Entertainment reels, female talent, short
    published(6, {
      title: "POV: pertama kali coba serum viral",
      channel: ["tiktok", "instagram"],
      format: "reels",
      pillar: "Hiburan",
      hook: "Reaksi jujur pas pertama pakai.",
      daysAgo: 4,
      durationSec: 22,
      aspects: { hookType: "POV", talent: "perempuan", konsep: "reaction", heuristik: "social proof", sound: "trending", cta: "follow", copyStruktur: "naratif singkat", flow: "build-up", topik: "serum" },
      r: { views: 142000, likes: 9800, comments: 760, shares: 2100, saves: 1900, reach: 130000, retention1s: 74, retention2s: 55, retention3s: 41 },
    }),
    published(7, {
      title: "GRWM sambil curhat skincare gagal",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Hiburan",
      hook: "Get ready bareng aku, ada gosip.",
      daysAgo: 15,
      durationSec: 38,
      aspects: { hookType: "ajakan personal", talent: "perempuan", konsep: "GRWM", heuristik: "social proof", sound: "trending", cta: "comment", copyStruktur: "naratif", flow: "casual", topik: "rutinitas" },
      r: { views: 96000, likes: 7100, comments: 1200, shares: 980, saves: 1100, reach: 88000, retention1s: 68, retention2s: 49, retention3s: 33 },
    }),
    // ---- Worst: promo carousel, no hook, no sound, hard sell
    published(8, {
      title: "PROMO 12.12 diskon 50% semua produk",
      channel: ["instagram"],
      format: "single_post",
      pillar: "Promosi",
      contentType: "ads",
      hook: "",
      daysAgo: 7,
      aspects: { hookType: "tanpa hook", talent: "tanpa talent", konsep: "hard sell", heuristik: "scarcity", sound: "tanpa sound", cta: "checkout", copyStruktur: "promo", flow: "announcement", topik: "diskon" },
      r: { views: 12000, likes: 380, comments: 24, shares: 60, saves: 90, reach: 14000, retention1s: 0, linkClicks: 210, conversions: 18 },
      insight: "Promo hard-sell tanpa hook underperform di reach organik.",
    }),
    published(9, {
      title: "Produk baru rilis — beli sekarang",
      channel: ["instagram"],
      format: "single_post",
      pillar: "Promosi",
      contentType: "ads",
      hook: "",
      daysAgo: 12,
      aspects: { hookType: "tanpa hook", talent: "tanpa talent", konsep: "hard sell", heuristik: "scarcity", sound: "tanpa sound", cta: "checkout", copyStruktur: "promo", flow: "announcement", topik: "produk baru" },
      r: { views: 9800, likes: 290, comments: 18, shares: 41, saves: 70, reach: 11000, retention1s: 0, linkClicks: 160, conversions: 12 },
    }),
    published(10, {
      title: "Reels promo flash sale tanpa narasi",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Promosi",
      contentType: "ads",
      hook: "Diskon!",
      daysAgo: 14,
      durationSec: 18,
      aspects: { hookType: "tanpa hook", talent: "tanpa talent", konsep: "hard sell", heuristik: "scarcity", sound: "tanpa sound", cta: "checkout", copyStruktur: "promo", flow: "announcement", topik: "flash sale" },
      r: { views: 15000, likes: 420, comments: 30, shares: 55, saves: 60, reach: 16000, retention1s: 31, retention2s: 18, retention3s: 9 },
    }),
    // ---- KOL pending approval (for Approval Inbox demo)
    baseItem({
      id: mid(11),
      title: "GRWM endorse produk baru (KOL)",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Hiburan",
      contentType: "kol",
      stage: "design",
      status: "review",
      priority: "sedang",
      hook: "Get ready with me pakai produk viral.",
      brief: { objective: "Awareness lewat KOL", keyMessage: "Cocok harian", reference: "moodboard" },
      durationSec: 40,
      aspects: { hookType: "ajakan personal", talent: "perempuan", konsep: "GRWM", heuristik: "social proof", sound: "trending" },
      currentPIC: "u3",
      stageDeadline: addDays(t, -1),
      needsApproval: true,
      reviewers: ["u1"],
      approvalStatus: "pending",
    }),
    // ---- In production
    baseItem({
      id: mid(12),
      title: "Interview: tren skincare 2026",
      channel: ["tiktok", "instagram"],
      format: "tiktok_video",
      pillar: "Edukasi",
      stage: "copywriting",
      status: "produksi",
      priority: "tinggi",
      hook: "2026 semua berubah soal skincare.",
      brief: { objective: "Edukasi tren", keyMessage: "Antisipasi tren", reference: "riset" },
      aspects: { konsep: "interview", talent: "laki-laki" },
      currentPIC: "u2",
      stageDeadline: addDays(t, 2),
    }),
    // ---- Bank items
    baseItem({
      id: mid(13),
      title: "Reaksi tren sound viral minggu ini",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Hiburan",
      stage: "planning",
      status: "bank",
      priority: "tinggi",
      hook: "POV: sound ini lagi di mana-mana.",
      brief: { objective: "Riding tren", keyMessage: "Relatable", reference: "tren" },
      isBanked: true,
      bankType: "trend",
      bankedAt: t,
      expiryDate: addDays(t, 5),
    }),
    baseItem({
      id: mid(14),
      title: "Throwback campaign lebaran",
      channel: ["instagram"],
      format: "single_post",
      pillar: "Hiburan",
      stage: "planning",
      status: "bank",
      priority: "rendah",
      hook: "Momen kebersamaan yang gak terlupakan.",
      brief: { objective: "Stok evergreen", keyMessage: "Dekat keluarga", reference: "arsip" },
      isBanked: true,
      bankType: "evergreen",
      bankedAt: t,
    }),
  ];
}

import type { Brand, BrandType, Goal, Industry } from "../types";

function configFor(name: string, industry: Industry, goals: Goal[]): BrandConfig {
  return {
    ...defaultConfig,
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
    // Eksternal — Azarine holds the rich Falco demo content (skincare/beauty)
    makeBrand("b_azarine", "Azarine", "eksternal", "beauty", ["awareness", "engagement"], seedItems()),
    makeBrand("b_cave", "Cave", "eksternal", "fnb", ["awareness", "community"], []),
    // Internal
    makeBrand("b_pbk", "PBK", "internal", "umum", ["awareness", "sales"], []),
    makeBrand("b_nakama", "Nakama Creative Lab", "internal", "tech", ["awareness", "leads"], []),
    makeBrand("b_insightory", "Insightory", "internal", "jasa", ["leads", "community"], []),
  ];
  return {
    brands,
    currentBrandId: "b_azarine",
    currentUserId: "u1",
  };
}
