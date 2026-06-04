import type {
  Channel,
  ContentFormat,
  ContentType,
  Goal,
  Industry,
  Priority,
  Role,
  Stage,
  Status,
} from "../types";

// Ordered list of the 11 workflow stages
export const STAGES: Stage[] = [
  "brief",
  "riset",
  "strategy",
  "ideation",
  "planning",
  "copywriting",
  "take",
  "design",
  "editing",
  "upload",
  "analisis",
];

export const STAGE_LABELS: Record<Stage, string> = {
  brief: "Brief",
  riset: "Riset",
  strategy: "Strategy",
  ideation: "Ideation",
  planning: "Planning",
  copywriting: "Copywriting",
  take: "Take Konten",
  design: "Design",
  editing: "Editing",
  upload: "Upload",
  analisis: "Analisis",
};

// Production stages — entry into these is guarded by the Brief Gate (§5.2)
export const PRODUCTION_STAGES: Stage[] = ["copywriting", "take", "design", "editing"];

export const STATUSES: Status[] = [
  "ide",
  "brief_ok",
  "produksi",
  "review",
  "revisi",
  "siap",
  "tayang",
  "dianalisis",
  "bank",
  "expired",
  "batal",
];

export const STATUS_LABELS: Record<Status, string> = {
  ide: "Ide",
  brief_ok: "Brief OK",
  produksi: "Produksi",
  review: "Review",
  revisi: "Revisi",
  siap: "Siap",
  tayang: "Tayang",
  dianalisis: "Dianalisis",
  bank: "Bank",
  expired: "Expired",
  batal: "Batal",
};

// Consistent colour per status, used by badges / rows / cards everywhere.
export const STATUS_COLORS: Record<
  Status,
  { bg: string; text: string; border: string; dot: string }
> = {
  ide: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", dot: "bg-slate-400" },
  brief_ok: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300", dot: "bg-sky-400" },
  produksi: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", dot: "bg-yellow-400" },
  review: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-400" },
  revisi: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300", dot: "bg-pink-400" },
  siap: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", dot: "bg-green-400" },
  tayang: { bg: "bg-emerald-200", text: "text-emerald-900", border: "border-emerald-400", dot: "bg-emerald-600" },
  dianalisis: { bg: "bg-blue-200", text: "text-blue-900", border: "border-blue-400", dot: "bg-blue-600" },
  bank: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", dot: "bg-purple-400" },
  expired: { bg: "bg-slate-300", text: "text-slate-700", border: "border-slate-400", dot: "bg-slate-500" },
  batal: { bg: "bg-slate-100", text: "text-slate-400 line-through", border: "border-slate-200", dot: "bg-slate-300" },
};

export const CHANNELS: Channel[] = ["instagram", "tiktok", "youtube", "other"];

export const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  other: "Lainnya",
};

export const CHANNEL_ICONS: Record<Channel, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
  other: "🔗",
};

export const FORMATS: ContentFormat[] = [
  "reels",
  "carousel",
  "story",
  "single_post",
  "short",
  "tiktok_video",
  "long_video",
  "yt_short",
  "live",
];

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  reels: "Reels",
  carousel: "Carousel",
  story: "Story",
  single_post: "Single Post",
  short: "Short",
  tiktok_video: "TikTok Video",
  long_video: "Long Video",
  yt_short: "YT Short",
  live: "Live",
};

export const CONTENT_TYPES: ContentType[] = ["organik", "kol", "affiliate", "ads", "ugc"];

export const PRIORITIES: Priority[] = ["tinggi", "sedang", "rendah"];

export const PRIORITY_COLORS: Record<Priority, string> = {
  tinggi: "text-red-600",
  sedang: "text-yellow-600",
  rendah: "text-slate-500",
};

export const ROLES: Role[] = [
  "lead",
  "strategist",
  "researcher",
  "creative",
  "copywriter",
  "videographer",
  "designer",
  "editor",
  "smo",
  "analyst",
  "kol_coord",
  "performance",
];

export const ROLE_LABELS: Record<Role, string> = {
  lead: "Lead / SM Manager",
  strategist: "Strategist",
  researcher: "Researcher",
  creative: "Creative / Ideation",
  copywriter: "Copywriter",
  videographer: "Videographer",
  designer: "Designer",
  editor: "Editor",
  smo: "Social Media Officer",
  analyst: "Analyst",
  kol_coord: "KOL & Affiliate Coord",
  performance: "Performance / Ads",
};

export const GOALS: Goal[] = ["awareness", "engagement", "sales", "leads", "community"];

export const GOAL_LABELS: Record<Goal, string> = {
  awareness: "Awareness",
  engagement: "Engagement",
  sales: "Sales",
  leads: "Leads",
  community: "Community",
};

export const INDUSTRIES: Industry[] = [
  "beauty",
  "fashion",
  "fnb",
  "jasa",
  "tech",
  "ecommerce",
  "umum",
];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  beauty: "Beauty",
  fashion: "Fashion",
  fnb: "F&B",
  jasa: "Jasa",
  tech: "Tech",
  ecommerce: "E-commerce",
  umum: "Umum",
};
