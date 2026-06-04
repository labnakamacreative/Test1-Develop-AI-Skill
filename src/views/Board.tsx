import { useMemo, useState } from "react";
import type { ModalControl } from "../viewTypes";
import type { Stage, Status } from "../types";
import { STAGES, STAGE_LABELS, STATUSES, STATUS_LABELS } from "../lib/constants";
import { isBriefComplete, isProductionStage, suggestedStatusForStage } from "../lib/helpers";
import { useStore } from "../lib/store";
import { ContentCard } from "../components/ContentCard";
import { FilterBar, applyFilters, emptyFilters, type Filters } from "../components/FilterBar";
import { Button } from "../components/ui";

export function Board({ ctrl }: { ctrl: ModalControl }) {
  const { items, config, updateItem } = useStore();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [groupBy, setGroupBy] = useState<"stage" | "status">("stage");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);

  const columns = groupBy === "stage" ? STAGES : STATUSES;
  const colLabel = (c: string) =>
    groupBy === "stage" ? STAGE_LABELS[c as Stage] : STATUS_LABELS[c as Status];

  const drop = (col: string) => {
    if (!dragId) return;
    const item = items.find((i) => i.id === dragId);
    if (!item) return;

    if (groupBy === "stage") {
      const target = col as Stage;
      if (target === item.stage) return;
      // Brief Gate
      if (isProductionStage(target) && !isBriefComplete(item)) {
        if (!confirm("⚠️ Brief belum lengkap — ini penyebab utama revisi. Paksa pindahkan ke produksi?")) {
          setDragId(null);
          setOverCol(null);
          return;
        }
      }
      const patch: Partial<typeof item> = {
        stage: target,
        status: suggestedStatusForStage(target, item),
      };
      // handoff
      if (config.handoffTrackingEnabled && item.assignments[target]) {
        patch.currentPIC = item.assignments[target]!;
        patch.receivedAt = new Date().toISOString();
      }
      updateItem(item.id, patch, `tahap: ${STAGE_LABELS[item.stage]} → ${STAGE_LABELS[target]}`);
    } else {
      const target = col as Status;
      if (target === item.status) return;
      updateItem(item.id, { status: target }, `status: ${STATUS_LABELS[item.status]} → ${STATUS_LABELS[target]}`);
    }
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Board</h1>
          <p className="text-sm text-slate-500">Kanban proses. Geser kartu untuk memindahkan tahap/status (tercatat di log).</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-sm">
            <button
              className={`rounded px-3 py-1 ${groupBy === "stage" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              onClick={() => setGroupBy("stage")}
            >
              Tahap
            </button>
            <button
              className={`rounded px-3 py-1 ${groupBy === "status" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
              onClick={() => setGroupBy("status")}
            >
              Status
            </button>
          </div>
          <Button onClick={() => ctrl.open(null)}>+ Konten</Button>
        </div>
      </header>

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="flex gap-3 overflow-x-auto pb-4 thin-scroll">
        {columns.map((col) => {
          const colItems = filtered.filter((i) => (groupBy === "stage" ? i.stage === col : i.status === col));
          return (
            <div
              key={col}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col); }}
              onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
              onDrop={() => drop(col)}
              className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 ${
                overCol === col ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-slate-100/60"
              }`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-slate-700">{colLabel(col)}</span>
                <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600">{colItems.length}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {colItems.map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onClick={() => ctrl.open(item.id)}
                  />
                ))}
                {colItems.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                    kosong
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
