import { useMemo } from "react";
import type { ModalControl } from "../viewTypes";
import { STAGE_LABELS } from "../lib/constants";
import {
  daysUntil,
  isBriefComplete,
  isProductionStage,
  memberName,
  nextStage,
  suggestedStatusForStage,
} from "../lib/helpers";
import { useStore } from "../lib/store";
import { ContentCard } from "../components/ContentCard";
import { Button, EmptyState } from "../components/ui";

export function MyQueue({ ctrl }: { ctrl: ModalControl }) {
  const { items, config, currentUserId, updateItem } = useStore();

  const mine = useMemo(
    () =>
      items
        .filter((i) => i.currentPIC === currentUserId && !["tayang", "dianalisis", "batal", "expired", "bank"].includes(i.status))
        .sort((a, b) => (daysUntil(a.stageDeadline) ?? 999) - (daysUntil(b.stageDeadline) ?? 999)),
    [items, currentUserId],
  );

  const handoff = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const ns = nextStage(item.stage);
    if (!ns) return;
    if (isProductionStage(ns) && !isBriefComplete(item)) {
      if (!confirm("Brief belum lengkap. Paksa serahkan ke tahap produksi?")) return;
    }
    const patch: Partial<typeof item> = {
      stage: ns,
      status: suggestedStatusForStage(ns, item),
    };
    const nextPIC = item.assignments[ns];
    if (nextPIC) {
      patch.currentPIC = nextPIC;
      patch.receivedAt = new Date().toISOString();
    }
    updateItem(item.id, patch, `selesai & serahkan: ${STAGE_LABELS[item.stage]} → ${STAGE_LABELS[ns]}`);
  };

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">My Queue</h1>
        <p className="text-sm text-slate-500">
          Antrian tugas untuk <strong>{memberName(config, currentUserId)}</strong>, diurutkan deadline.
        </p>
      </header>

      {mine.length === 0 ? (
        <EmptyState title="🎉 Tidak ada tugas aktif" hint="Semua konten di tanganmu sudah diteruskan." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((item) => {
            const ns = nextStage(item.stage);
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white">
                <ContentCard item={item} onClick={() => ctrl.open(item.id)} />
                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                  <span className="text-xs text-slate-500">Tahap: {STAGE_LABELS[item.stage]}</span>
                  {ns && <Button size="sm" onClick={() => handoff(item.id)}>Selesai & serahkan →</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
