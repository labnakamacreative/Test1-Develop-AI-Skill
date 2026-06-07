// ============================================================
// Core domain types — mirror of the functional spec (§2 & §3)
// ============================================================

export type Channel = "instagram" | "tiktok" | "youtube" | "other";

export type ContentFormat =
  | "reels"
  | "carousel"
  | "story"
  | "single_post" // IG
  | "short"
  | "tiktok_video" // TT
  | "long_video"
  | "yt_short" // YT
  | "live";

// 11 stage workflow
export type Stage =
  | "brief"
  | "riset"
  | "strategy"
  | "ideation"
  | "planning"
  | "copywriting"
  | "take"
  | "design"
  | "editing"
  | "upload"
  | "analisis";

// cross-stage status (drives colour & filtering)
export type Status =
  | "ide"
  | "brief_ok"
  | "produksi"
  | "review"
  | "revisi"
  | "siap"
  | "tayang"
  | "dianalisis"
  | "bank"
  | "expired"
  | "batal";

export type ContentType = "organik" | "kol" | "affiliate" | "ads" | "ugc";
export type Priority = "tinggi" | "sedang" | "rendah";
export type ApprovalStatus = "tidak_perlu" | "pending" | "approved" | "revisi";
export type BankType = "evergreen" | "trend";

export interface ActivityEntry {
  timestamp: string;
  user: string;
  action: string;
  note?: string;
}

export interface ContentResults {
  views?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  linkClicks?: number;
  conversions?: number;
  profileVisits?: number;
  // retention rate (%) at second N — key for hook quality analysis
  retention1s?: number;
  retention2s?: number;
  retention3s?: number;
  retention4s?: number;
  retention5s?: number;
}

export interface ContentBrief {
  objective: string;
  keyMessage: string;
  reference: string;
}

export interface ContentItem {
  // identity
  id: string;
  title: string;
  campaign?: string;

  // classification
  channel: Channel[];
  format: ContentFormat;
  pillar: string;
  contentType: ContentType;

  // stage & status
  stage: Stage;
  status: Status;
  priority: Priority;

  // brief & content
  hook: string;
  brief: ContentBrief;
  copy: string;
  assetLinks: string[];

  // content aspects for pattern analysis (Falco); keys follow BrandConfig.contentAspects
  aspects?: Record<string, string>;
  durationSec?: number;
  slideCount?: number;

  // ownership & handoff
  currentPIC: string | null;
  assignments: Partial<Record<Stage, string>>;
  receivedAt?: string;
  stageDeadline?: string;

  // approval
  needsApproval: boolean;
  reviewers: string[];
  approvalStatus: ApprovalStatus;
  revisionCount: number;

  // scheduling & banking
  scheduledDate: string | null;
  isBanked: boolean;
  bankedAt?: string;
  expiryDate?: string | null;
  bankType?: BankType;

  // results & analysis
  results?: ContentResults;
  insight?: string;

  // meta
  notes: string;
  version: number;
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
  activityLog: ActivityEntry[];
}

// ============================================================
// Brand config (§3)
// ============================================================

export type Role =
  | "lead"
  | "strategist"
  | "researcher"
  | "creative"
  | "copywriter"
  | "videographer"
  | "designer"
  | "editor"
  | "smo"
  | "analyst"
  | "kol_coord"
  | "performance";

export type Goal = "awareness" | "engagement" | "sales" | "leads" | "community";

export type Industry =
  | "beauty"
  | "fashion"
  | "fnb"
  | "jasa"
  | "tech"
  | "ecommerce"
  | "umum";

export interface TeamMember {
  id: string;
  name: string;
  roles: Role[];
  active: boolean;
  accessLevel?: AccessLevel; // permission tier; undefined = treated as full access (legacy)
}

export type AccessLevel = "staff" | "manager" | "head" | "stakeholder";

export interface Pillar {
  name: string;
  description: string;
}

export interface BrandConfig {
  brandName: string;
  industry: Industry;
  primaryGoals: Goal[];
  channels: Channel[];

  members: TeamMember[];
  rolesEnabled: Role[];

  approvalEnabled: boolean;
  handoffTrackingEnabled: boolean;
  roleBasedViewsEnabled: boolean;

  bankHealthyMin: number;
  bankHealthyMax: number;
  defaultTrendExpiryDays: number;

  pillars: Pillar[];
  hashtagSets: { pillar: string; tags: string[] }[];
  postingTimes: { channel: Channel; times: string[] }[];
  brandGuidelineUrl?: string;

  // Content aspects the brand tracks (powers Falco pattern analysis). Editable in Settings.
  contentAspects: { key: string; label: string }[];
}

// ============================================================
// Multi-brand workspaces — each brand is an isolated dashboard
// (own config, team, pillars, goals, content & analytics).
// ============================================================

export type BrandType = "internal" | "eksternal";
export type BrandStatus = "aktif" | "nonaktif";

export interface Brand {
  id: string;
  type: BrandType;
  status: BrandStatus;
  config: BrandConfig; // config.brandName is the brand's display name
  items: ContentItem[];
}

export interface AppState {
  brands: Brand[];
  currentBrandId: string;
  currentUserId: string | null; // logged-in member (validated against current brand)
}
