import type { AppState, BrandConfig, ContentItem } from "../types";
import { addDays, nowISO, todayISO } from "./helpers";

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
  approvalEnabled: false,
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

export function seedItems(): ContentItem[] {
  const t = todayISO();
  return [
    baseItem({
      id: addMonthPrefix(1),
      title: "5 kesalahan skincare pemula",
      channel: ["instagram", "tiktok"],
      format: "reels",
      pillar: "Edukasi",
      stage: "copywriting",
      status: "produksi",
      priority: "tinggi",
      hook: "Stop! Kamu mungkin lagi ngerusak kulitmu sendiri.",
      brief: {
        objective: "Edukasi audiens baru soal rutinitas dasar",
        keyMessage: "Skincare sederhana lebih baik daripada banyak produk.",
        reference: "ref: video kompetitor X",
      },
      currentPIC: "u2",
      assignments: { copywriting: "u2", take: "u2", design: "u3", editing: "u3" },
      stageDeadline: addDays(t, 2),
      receivedAt: nowISO(),
    }),
    baseItem({
      id: addMonthPrefix(2),
      title: "GRWM endorse produk baru",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Hiburan",
      contentType: "kol",
      stage: "design",
      status: "review",
      priority: "sedang",
      hook: "Get ready with me pakai produk yang lagi viral.",
      brief: {
        objective: "Awareness produk baru lewat KOL",
        keyMessage: "Produk cocok untuk pemakaian harian.",
        reference: "moodboard di drive",
      },
      currentPIC: "u3",
      assignments: { design: "u3", editing: "u3" },
      stageDeadline: addDays(t, -1),
      needsApproval: true,
      reviewers: ["u1"],
      approvalStatus: "pending",
    }),
    baseItem({
      id: addMonthPrefix(3),
      title: "Tips hemat budget bulanan",
      channel: ["instagram"],
      format: "carousel",
      pillar: "Edukasi",
      stage: "upload",
      status: "siap",
      priority: "sedang",
      hook: "Gaji cepat habis? Coba 4 trik ini.",
      brief: {
        objective: "Engagement lewat konten save-able",
        keyMessage: "Budgeting itu kebiasaan, bukan bakat.",
        reference: "internal doc",
      },
      currentPIC: "u4",
      scheduledDate: addDays(t, 1),
    }),
    baseItem({
      id: addMonthPrefix(4),
      title: "Throwback campaign lebaran",
      channel: ["instagram"],
      format: "single_post",
      pillar: "Hiburan",
      stage: "planning",
      status: "bank",
      priority: "rendah",
      hook: "Momen kebersamaan yang gak terlupakan.",
      brief: {
        objective: "Stok konten evergreen",
        keyMessage: "Brand dekat dengan momen keluarga.",
        reference: "arsip 2023",
      },
      isBanked: true,
      bankType: "evergreen",
      bankedAt: t,
    }),
    baseItem({
      id: addMonthPrefix(5),
      title: "Reaksi tren sound viral minggu ini",
      channel: ["tiktok"],
      format: "tiktok_video",
      pillar: "Hiburan",
      stage: "planning",
      status: "bank",
      priority: "tinggi",
      hook: "POV: sound ini lagi di mana-mana.",
      brief: {
        objective: "Riding tren untuk reach",
        keyMessage: "Brand update & relatable.",
        reference: "tren TikTok",
      },
      isBanked: true,
      bankType: "trend",
      bankedAt: t,
      expiryDate: addDays(t, 5),
    }),
    baseItem({
      id: addMonthPrefix(6),
      title: "Review jujur produk best seller",
      channel: ["youtube", "instagram"],
      format: "long_video",
      pillar: "Edukasi",
      stage: "analisis",
      status: "dianalisis",
      priority: "sedang",
      hook: "Worth it atau enggak? Aku tes 30 hari.",
      brief: {
        objective: "Trust building",
        keyMessage: "Kami transparan soal produk.",
        reference: "-",
      },
      scheduledDate: addDays(t, -7),
      results: { views: 45200, likes: 3100, comments: 240, shares: 180, saves: 920, reach: 51000 },
      insight: "Konten review panjang dapat saves tinggi — audiens suka kedalaman.",
    }),
  ];
}

function addMonthPrefix(n: number): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}-${String(n).padStart(3, "0")}`;
}

export function seedState(): AppState {
  return {
    config: defaultConfig,
    items: seedItems(),
    currentUserId: "u1",
  };
}
