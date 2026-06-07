import type { AccessLevel } from "../types";

// ============================================================
// Role-based access control (RBAC). Permission tiers gate UI
// actions. This is a prototype layer (no real auth) — the
// "current account" is chosen via the sidebar switcher.
// ============================================================

export const ACCESS_RANK: Record<AccessLevel, number> = {
  staff: 1,
  manager: 2,
  head: 3,
  stakeholder: 4,
};

export const ACCESS_LABELS: Record<AccessLevel, string> = {
  staff: "Staff",
  manager: "Manager",
  head: "Head / Lead",
  stakeholder: "Stakeholder",
};

export const ACCESS_LEVELS: AccessLevel[] = ["staff", "manager", "head", "stakeholder"];

export type Permission =
  | "editContent"
  | "deleteContent"
  | "approve"
  | "createBrand"
  | "manageBrand"
  | "editSettings"
  | "manageAccounts";

const MIN_RANK: Record<Permission, number> = {
  editContent: 1, // staff+
  deleteContent: 2, // manager+
  approve: 2, // manager+
  createBrand: 2, // manager+
  // manage = rename/status/type/delete brand. Kept equal to createBrand so that
  // whoever can create a project can also manage & delete it (intuitive).
  manageBrand: 2, // manager+
  editSettings: 2, // manager+
  manageAccounts: 4, // stakeholder only
};

// undefined accessLevel → treated as stakeholder (avoids locking out legacy data)
export function can(level: AccessLevel | undefined, p: Permission): boolean {
  const rank = ACCESS_RANK[level ?? "stakeholder"];
  return rank >= MIN_RANK[p];
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  editContent: "Buat & edit konten",
  deleteContent: "Hapus konten",
  approve: "Approve / minta revisi",
  createBrand: "Buat brand/project",
  manageBrand: "Kelola brand (nama/status/hapus)",
  editSettings: "Edit Settings brand",
  manageAccounts: "Kelola akun & level akses",
};
