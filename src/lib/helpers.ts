import type {
  ActivityEntry,
  BrandConfig,
  ContentItem,
  ContentType,
  Goal,
  Industry,
  Stage,
  Status,
} from "../types";
import { PRODUCTION_STAGES, STAGES } from "./constants";

export const nowISO = () => new Date().toISOString();
export const todayISO = () => new Date().toISOString().slice(0, 10);

// ----- ID generation: "YYMM-XXX" (e.g. 2406-001) -----
export function generateId(items: ContentItem[]): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const prefix = `${yy}${mm}`;
  const seq = items
    .filter((i) => i.id.startsWith(prefix))
    .map((i) => parseInt(i.id.split("-")[1] || "0", 10))
    .reduce((max, n) => Math.max(max, n), 0);
  return `${prefix}-${String(seq + 1).padStart(3, "0")}`;
}

export function makeActivity(user: string, action: string, note?: string): ActivityEntry {
  return { timestamp: nowISO(), user, action, note };
}

// ----- Brief Gate (§5.2): brief must be complete to enter production -----
export function isBriefComplete(item: ContentItem): boolean {
  const b = item.brief;
  return Boolean(b && b.objective.trim() && b.keyMessage.trim() && b.reference.trim());
}

export function isProductionStage(stage: Stage): boolean {
  return PRODUCTION_STAGES.includes(stage);
}

export function stageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

export function nextStage(stage: Stage): Stage | null {
  const idx = stageIndex(stage);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

// ----- Suggested status when a card lands in a stage -----
export function suggestedStatusForStage(stage: Stage, item: ContentItem): Status {
  if (item.status === "bank" || item.isBanked) return "bank";
  switch (stage) {
    case "brief":
    case "riset":
    case "strategy":
    case "ideation":
      return "ide";
    case "planning":
      return "brief_ok";
    case "copywriting":
    case "take":
    case "design":
    case "editing":
      return "produksi";
    case "upload":
      return "siap";
    case "analisis":
      return "dianalisis";
    default:
      return item.status;
  }
}

// ----- Approval requirement (§5.5) -----
export function shouldRequireApproval(item: ContentItem, config: BrandConfig): boolean {
  if (!config.approvalEnabled) return false;
  const sensitive: ContentType[] = ["kol", "affiliate", "ads"];
  return sensitive.includes(item.contentType);
}

// ----- Banking / expiry (§5.4) -----
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  const today = new Date(todayISO()).getTime();
  return Math.round((target - today) / 86400000);
}

export function isExpired(item: ContentItem): boolean {
  if (item.bankType !== "trend" || !item.expiryDate) return false;
  const d = daysUntil(item.expiryDate);
  return d !== null && d < 0;
}

// Apply expiry sweep — returns a new list with expired trend content flagged.
export function sweepExpiry(items: ContentItem[]): { items: ContentItem[]; changed: number } {
  let changed = 0;
  const updated = items.map((item) => {
    if (item.isBanked && isExpired(item) && item.status !== "expired") {
      changed++;
      return {
        ...item,
        status: "expired" as Status,
        updatedAt: nowISO(),
        activityLog: [
          ...item.activityLog,
          makeActivity("system", "konten trend kedaluwarsa → expired"),
        ],
      };
    }
    return item;
  });
  return { items: updated, changed };
}

// ----- Engagement aggregate (§2.5) -----
export function computeEngagement(item: ContentItem): number {
  const r = item.results;
  if (!r) return 0;
  if (typeof r.engagement === "number") return r.engagement;
  return (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0) + (r.saves ?? 0);
}

// ----- Deadline alarm -----
export function isOverdue(item: ContentItem): boolean {
  if (!item.stageDeadline) return false;
  if (["tayang", "dianalisis", "bank", "batal", "expired"].includes(item.status)) return false;
  const d = daysUntil(item.stageDeadline);
  return d !== null && d < 0;
}

// ----- Auto config recommendation by team size (§3.1) -----
export interface ConfigRecommendation {
  approvalEnabled: boolean;
  handoffTrackingEnabled: boolean;
  roleBasedViewsEnabled: boolean;
  label: string;
}

export function recommendConfig(memberCount: number): ConfigRecommendation {
  if (memberCount <= 4) {
    return {
      approvalEnabled: false,
      handoffTrackingEnabled: false,
      roleBasedViewsEnabled: false,
      label: "Tim kecil (2–4): UI ringkas, tanpa approval & handoff tracking.",
    };
  }
  if (memberCount <= 9) {
    return {
      approvalEnabled: true,
      handoffTrackingEnabled: true,
      roleBasedViewsEnabled: true,
      label: "Tim menengah (5–9): approval untuk konten sensitif, handoff & antrian aktif.",
    };
  }
  return {
    approvalEnabled: true,
    handoffTrackingEnabled: true,
    roleBasedViewsEnabled: true,
    label: "Tim besar (10–15): semua fitur aktif + panel bottleneck & approval matrix.",
  };
}

// ----- Industry defaults (§6) -----
export interface IndustryDefaults {
  defaultTrendExpiryDays: number;
  rolesToEnable: BrandConfig["rolesEnabled"];
  showKOLPanel: boolean;
  showConversionMetrics: boolean;
}

export function industryDefaults(industry: Industry): IndustryDefaults {
  switch (industry) {
    case "beauty":
    case "fashion":
      return {
        defaultTrendExpiryDays: 8,
        rolesToEnable: ["kol_coord"],
        showKOLPanel: true,
        showConversionMetrics: false,
      };
    case "ecommerce":
      return {
        defaultTrendExpiryDays: 14,
        rolesToEnable: ["performance"],
        showKOLPanel: false,
        showConversionMetrics: true,
      };
    case "jasa":
    case "tech":
      return {
        defaultTrendExpiryDays: 21,
        rolesToEnable: [],
        showKOLPanel: false,
        showConversionMetrics: true,
      };
    case "fnb":
      return {
        defaultTrendExpiryDays: 12,
        rolesToEnable: [],
        showKOLPanel: false,
        showConversionMetrics: false,
      };
    default:
      return {
        defaultTrendExpiryDays: 14,
        rolesToEnable: [],
        showKOLPanel: false,
        showConversionMetrics: false,
      };
  }
}

// ----- Goal → which metrics to surface (§7 / §8) -----
export function metricsForGoals(goals: Goal[]): string[] {
  const set = new Set<string>();
  for (const g of goals) {
    if (g === "awareness") ["reach", "views", "followerGrowth"].forEach((m) => set.add(m));
    if (g === "engagement") ["engagement", "saves", "shares"].forEach((m) => set.add(m));
    if (g === "sales") ["linkClicks", "conversions", "roas"].forEach((m) => set.add(m));
    if (g === "leads") ["linkClicks", "conversions"].forEach((m) => set.add(m));
    if (g === "community") ["comments"].forEach((m) => set.add(m));
  }
  return Array.from(set);
}

export function showSalesFields(goals: Goal[]): boolean {
  return goals.includes("sales") || goals.includes("leads");
}

// ----- Misc formatting -----
export function fmtNum(n?: number): string {
  if (n === undefined || n === null) return "–";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function memberName(config: BrandConfig, id?: string | null): string {
  if (!id) return "—";
  return config.members.find((m) => m.id === id)?.name ?? id;
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
