import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Brand, BrandConfig, BrandType, ContentItem } from "../types";
import { generateId, makeActivity, nowISO, sweepExpiry } from "./helpers";
import { DEFAULT_CONTENT_ASPECTS, defaultConfig, seedState } from "./seed";

// ============================================================
// DataStore abstraction (§9). v1 = localStorage. Swap this impl
// for a backend adapter in v2 without touching the UI.
// ============================================================

const STORAGE_KEY = "smm-dashboard-state-v1";

export interface DataStore {
  load(): AppState | null;
  save(state: AppState): void;
}

export const localStorageDataStore: DataStore = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppState) : null;
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / availability errors */
    }
  },
};

// Migrate any older saved shape into the current multi-brand AppState.
function migrate(loaded: any): AppState {
  if (!loaded) return seedState();
  // legacy single-brand shape: { config, items, currentUserId }
  if (!loaded.brands && loaded.config && Array.isArray(loaded.items)) {
    const brand: Brand = {
      id: "b_" + Math.random().toString(36).slice(2, 8),
      type: "internal",
      status: "aktif",
      config: { ...loaded.config, contentAspects: loaded.config.contentAspects ?? DEFAULT_CONTENT_ASPECTS },
      items: loaded.items,
    };
    return { brands: [brand], currentBrandId: brand.id, currentUserId: loaded.currentUserId ?? null };
  }
  // current shape — ensure each brand has contentAspects
  if (Array.isArray(loaded.brands)) {
    for (const b of loaded.brands) {
      if (!b.config.contentAspects) b.config.contentAspects = DEFAULT_CONTENT_ASPECTS;
      if (!Array.isArray(b.items)) b.items = [];
    }
    if (!loaded.currentBrandId || !loaded.brands.find((b: Brand) => b.id === loaded.currentBrandId)) {
      loaded.currentBrandId = loaded.brands[0]?.id ?? "";
    }
    return loaded as AppState;
  }
  return seedState();
}

// ============================================================
// React store. Exposes the CURRENT brand's config & items so all
// existing views work unchanged; adds brand-management API.
// ============================================================

interface StoreContextValue {
  state: AppState;
  // current brand (scoped)
  config: BrandConfig;
  items: ContentItem[];
  currentUserId: string | null;
  setCurrentUser: (id: string | null) => void;
  // content CRUD (operate on current brand)
  createItem: (partial?: Partial<ContentItem>) => ContentItem;
  updateItem: (id: string, patch: Partial<ContentItem>, activityAction?: string) => void;
  deleteItem: (id: string) => void;
  updateConfig: (patch: Partial<BrandConfig>) => void;
  // brand workspaces
  brands: Brand[];
  currentBrand: Brand;
  currentBrandId: string;
  switchBrand: (id: string) => void;
  createBrand: (name: string, type: BrandType) => Brand;
  updateBrandMeta: (id: string, patch: { name?: string; type?: BrandType; status?: Brand["status"] }) => void;
  deleteBrand: (id: string) => void;
  // import / export & reset
  replaceState: (state: AppState) => void;
  resetSeed: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = localStorageDataStore;
  const [state, setState] = useState<AppState>(() => migrate(store.load()));
  const didSweep = useRef(false);

  useEffect(() => {
    store.save(state);
  }, [state, store]);

  // expiry sweep across all brands once on open
  useEffect(() => {
    if (didSweep.current) return;
    didSweep.current = true;
    setState((s) => ({
      ...s,
      brands: s.brands.map((b) => {
        const { items, changed } = sweepExpiry(b.items);
        return changed > 0 ? { ...b, items } : b;
      }),
    }));
  }, []);

  const currentBrand = useMemo(
    () => state.brands.find((b) => b.id === state.currentBrandId) ?? state.brands[0],
    [state],
  );

  const actorName = useCallback(
    (s: AppState) => {
      const b = s.brands.find((x) => x.id === s.currentBrandId) ?? s.brands[0];
      return b?.config.members.find((m) => m.id === s.currentUserId)?.name ?? "user";
    },
    [],
  );

  // patch only the current brand
  const patchBrand = (s: AppState, fn: (b: Brand) => Brand): AppState => ({
    ...s,
    brands: s.brands.map((b) => (b.id === s.currentBrandId ? fn(b) : b)),
  });

  const createItem = useCallback<StoreContextValue["createItem"]>((partial = {}) => {
    let created!: ContentItem;
    setState((s) => {
      const brand = s.brands.find((b) => b.id === s.currentBrandId) ?? s.brands[0];
      const ts = nowISO();
      created = {
        id: generateId(brand.items),
        title: partial.title ?? "Konten baru",
        channel: partial.channel ?? ["instagram"],
        format: partial.format ?? "reels",
        pillar: partial.pillar ?? brand.config.pillars[0]?.name ?? "Umum",
        contentType: partial.contentType ?? "organik",
        stage: partial.stage ?? "ideation",
        status: partial.status ?? "ide",
        priority: partial.priority ?? "sedang",
        hook: partial.hook ?? "",
        brief: partial.brief ?? { objective: "", keyMessage: "", reference: "" },
        copy: partial.copy ?? "",
        assetLinks: partial.assetLinks ?? [],
        aspects: partial.aspects ?? {},
        durationSec: partial.durationSec,
        slideCount: partial.slideCount,
        currentPIC: partial.currentPIC ?? null,
        assignments: partial.assignments ?? {},
        receivedAt: partial.receivedAt,
        stageDeadline: partial.stageDeadline,
        needsApproval: partial.needsApproval ?? false,
        reviewers: partial.reviewers ?? [],
        approvalStatus: partial.approvalStatus ?? "tidak_perlu",
        revisionCount: partial.revisionCount ?? 0,
        scheduledDate: partial.scheduledDate ?? null,
        isBanked: partial.isBanked ?? false,
        bankedAt: partial.bankedAt,
        expiryDate: partial.expiryDate,
        bankType: partial.bankType,
        results: partial.results,
        insight: partial.insight,
        notes: partial.notes ?? "",
        version: 1,
        dependencies: partial.dependencies,
        createdAt: ts,
        updatedAt: ts,
        activityLog: [makeActivity(actorName(s), "konten dibuat")],
      };
      return patchBrand(s, (b) => ({ ...b, items: [created, ...b.items] }));
    });
    return created;
  }, [actorName]);

  const updateItem = useCallback<StoreContextValue["updateItem"]>((id, patch, activityAction) => {
    setState((s) =>
      patchBrand(s, (b) => ({
        ...b,
        items: b.items.map((it) => {
          if (it.id !== id) return it;
          const log = activityAction
            ? [...it.activityLog, makeActivity(actorName(s), activityAction)]
            : it.activityLog;
          return { ...it, ...patch, updatedAt: nowISO(), activityLog: log };
        }),
      })),
    );
  }, [actorName]);

  const deleteItem = useCallback<StoreContextValue["deleteItem"]>((id) => {
    setState((s) => patchBrand(s, (b) => ({ ...b, items: b.items.filter((it) => it.id !== id) })));
  }, []);

  const updateConfig = useCallback<StoreContextValue["updateConfig"]>((patch) => {
    setState((s) => patchBrand(s, (b) => ({ ...b, config: { ...b.config, ...patch } })));
  }, []);

  const setCurrentUser = useCallback<StoreContextValue["setCurrentUser"]>((id) => {
    setState((s) => ({ ...s, currentUserId: id }));
  }, []);

  const switchBrand = useCallback<StoreContextValue["switchBrand"]>((id) => {
    setState((s) => {
      const b = s.brands.find((x) => x.id === id);
      if (!b) return s;
      const firstMember = b.config.members.find((m) => m.active)?.id ?? b.config.members[0]?.id ?? null;
      return { ...s, currentBrandId: id, currentUserId: firstMember };
    });
  }, []);

  const createBrand = useCallback<StoreContextValue["createBrand"]>((name, type) => {
    let brand!: Brand;
    setState((s) => {
      brand = {
        id: "b_" + Math.random().toString(36).slice(2, 8),
        type,
        status: "aktif",
        config: { ...defaultConfig, brandName: name, contentAspects: DEFAULT_CONTENT_ASPECTS },
        items: [],
      };
      return { ...s, brands: [...s.brands, brand], currentBrandId: brand.id };
    });
    return brand;
  }, []);

  const updateBrandMeta = useCallback<StoreContextValue["updateBrandMeta"]>((id, patch) => {
    setState((s) => ({
      ...s,
      brands: s.brands.map((b) =>
        b.id === id
          ? {
              ...b,
              type: patch.type ?? b.type,
              status: patch.status ?? b.status,
              config: patch.name !== undefined ? { ...b.config, brandName: patch.name } : b.config,
            }
          : b,
      ),
    }));
  }, []);

  const deleteBrand = useCallback<StoreContextValue["deleteBrand"]>((id) => {
    setState((s) => {
      if (s.brands.length <= 1) return s; // keep at least one workspace
      const brands = s.brands.filter((b) => b.id !== id);
      const currentBrandId = s.currentBrandId === id ? brands[0].id : s.currentBrandId;
      return { ...s, brands, currentBrandId };
    });
  }, []);

  const replaceState = useCallback<StoreContextValue["replaceState"]>((next) => setState(migrate(next)), []);
  const resetSeed = useCallback(() => setState(seedState()), []);

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      config: currentBrand.config,
      items: currentBrand.items,
      currentUserId: state.currentUserId,
      setCurrentUser,
      createItem,
      updateItem,
      deleteItem,
      updateConfig,
      brands: state.brands,
      currentBrand,
      currentBrandId: state.currentBrandId,
      switchBrand,
      createBrand,
      updateBrandMeta,
      deleteBrand,
      replaceState,
      resetSeed,
    }),
    [state, currentBrand, setCurrentUser, createItem, updateItem, deleteItem, updateConfig, switchBrand, createBrand, updateBrandMeta, deleteBrand, replaceState, resetSeed],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
