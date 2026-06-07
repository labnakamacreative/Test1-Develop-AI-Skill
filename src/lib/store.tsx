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
import type { AppState, BrandConfig, ContentItem } from "../types";
import { generateId, makeActivity, nowISO, sweepExpiry } from "./helpers";
import { seedState } from "./seed";

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

// ============================================================
// React store: single source of truth for all views (§5.1)
// ============================================================

interface StoreContextValue {
  state: AppState;
  config: BrandConfig;
  items: ContentItem[];
  currentUserId: string | null;
  setCurrentUser: (id: string | null) => void;
  // CRUD
  createItem: (partial?: Partial<ContentItem>) => ContentItem;
  updateItem: (id: string, patch: Partial<ContentItem>, activityAction?: string) => void;
  deleteItem: (id: string) => void;
  updateConfig: (patch: Partial<BrandConfig>) => void;
  // import / export
  replaceState: (state: AppState) => void;
  resetSeed: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = localStorageDataStore;
  const [state, setState] = useState<AppState>(() => {
    const loaded = store.load();
    return loaded ?? seedState();
  });
  const didSweep = useRef(false);

  // persist on every change
  useEffect(() => {
    store.save(state);
  }, [state, store]);

  // run expiry sweep once on app open (§5.4)
  useEffect(() => {
    if (didSweep.current) return;
    didSweep.current = true;
    setState((s) => {
      const { items, changed } = sweepExpiry(s.items);
      return changed > 0 ? { ...s, items } : s;
    });
  }, []);

  const actorName = useCallback(
    (s: AppState) => s.config.members.find((m) => m.id === s.currentUserId)?.name ?? "user",
    [],
  );

  const createItem = useCallback<StoreContextValue["createItem"]>((partial = {}) => {
    let created!: ContentItem;
    setState((s) => {
      const ts = nowISO();
      created = {
        id: generateId(s.items),
        title: partial.title ?? "Konten baru",
        channel: partial.channel ?? ["instagram"],
        format: partial.format ?? "reels",
        pillar: partial.pillar ?? s.config.pillars[0]?.name ?? "Umum",
        contentType: partial.contentType ?? "organik",
        stage: partial.stage ?? "ideation",
        status: partial.status ?? "ide",
        priority: partial.priority ?? "sedang",
        hook: partial.hook ?? "",
        brief: partial.brief ?? { objective: "", keyMessage: "", reference: "" },
        copy: partial.copy ?? "",
        assetLinks: partial.assetLinks ?? [],
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
      return { ...s, items: [created, ...s.items] };
    });
    return created;
  }, [actorName]);

  const updateItem = useCallback<StoreContextValue["updateItem"]>(
    (id, patch, activityAction) => {
      setState((s) => {
        const items = s.items.map((it) => {
          if (it.id !== id) return it;
          const log = activityAction
            ? [...it.activityLog, makeActivity(actorName(s), activityAction)]
            : it.activityLog;
          return { ...it, ...patch, updatedAt: nowISO(), activityLog: log };
        });
        return { ...s, items };
      });
    },
    [actorName],
  );

  const deleteItem = useCallback<StoreContextValue["deleteItem"]>((id) => {
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));
  }, []);

  const updateConfig = useCallback<StoreContextValue["updateConfig"]>((patch) => {
    setState((s) => ({ ...s, config: { ...s.config, ...patch } }));
  }, []);

  const setCurrentUser = useCallback<StoreContextValue["setCurrentUser"]>((id) => {
    setState((s) => ({ ...s, currentUserId: id }));
  }, []);

  const replaceState = useCallback<StoreContextValue["replaceState"]>((next) => {
    setState(next);
  }, []);

  const resetSeed = useCallback(() => setState(seedState()), []);

  const value = useMemo<StoreContextValue>(
    () => ({
      state,
      config: state.config,
      items: state.items,
      currentUserId: state.currentUserId,
      setCurrentUser,
      createItem,
      updateItem,
      deleteItem,
      updateConfig,
      replaceState,
      resetSeed,
    }),
    [state, setCurrentUser, createItem, updateItem, deleteItem, updateConfig, replaceState, resetSeed],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
