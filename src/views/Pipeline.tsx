import { useMemo, useRef, useState } from "react";
import type { ModalControl } from "../viewTypes";
import type { ContentItem, Status } from "../types";
import { STATUSES, STATUS_LABELS, STAGE_LABELS, FORMAT_LABELS } from "../lib/constants";
import { fmtDate, isOverdue } from "../lib/helpers";
import { useStore } from "../lib/store";
import { exportCSV, exportJSON, importJSON } from "../lib/io";
import { FilterBar, applyFilters, emptyFilters, type Filters } from "../components/FilterBar";
import { Button, StatusBadge } from "../components/ui";

type SortKey = "id" | "title" | "stage" | "status" | "priority" | "scheduledDate";
const ALL_COLS = ["id", "title", "channel", "format", "pillar", "stage", "status", "priority", "pic", "deadline", "scheduled"] as const;
type Col = (typeof ALL_COLS)[number];

export function Pipeline({ ctrl }: { ctrl: ModalControl }) {
  const { items, config, state, updateItem, replaceState } = useStore();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "id", dir: -1 });
  const [cols, setCols] = useState<Col[]>([...ALL_COLS]);
  const [showCols, setShowCols] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => {
    const f = applyFilters(items, filters);
    return [...f].sort((a, b) => {
      const av = (a[sort.key as keyof ContentItem] ?? "") as string;
      const bv = (b[sort.key as keyof ContentItem] ?? "") as string;
      return av > bv ? sort.dir : av < bv ? -sort.dir : 0;
    });
  }, [items, filters, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const has = (c: Col) => cols.includes(c);
  const toggleCol = (c: Col) => setCols((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));

  const handleImport = async (file: File) => {
    try {
      const next = await importJSON(file);
      if (confirm("Impor akan mengganti seluruh data saat ini. Lanjutkan?")) replaceState(next);
    } catch (e) {
      alert("Gagal impor: " + (e as Error).message);
    }
  };

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline / List</h1>
          <p className="text-sm text-slate-500">Tabel master — sumber kebenaran. Semua view lain adalah turunan.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCols((s) => !s)}>Kolom</Button>
          <Button variant="outline" size="sm" onClick={() => exportJSON(state)}>Export JSON</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(rows)}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Import</Button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <Button onClick={() => ctrl.open(null)}>+ Konten</Button>
        </div>
      </header>

      {showCols && (
        <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          {ALL_COLS.map((c) => (
            <label key={c} className="flex items-center gap-1.5">
              <input type="checkbox" checked={has(c)} onChange={() => toggleCol(c)} />
              <span className="capitalize">{c}</span>
            </label>
          ))}
        </div>
      )}

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white thin-scroll">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {has("id") && <Th onClick={() => toggleSort("id")}>ID</Th>}
              {has("title") && <Th onClick={() => toggleSort("title")}>Judul</Th>}
              {has("channel") && <Th>Channel</Th>}
              {has("format") && <Th>Format</Th>}
              {has("pillar") && <Th>Pillar</Th>}
              {has("stage") && <Th onClick={() => toggleSort("stage")}>Tahap</Th>}
              {has("status") && <Th onClick={() => toggleSort("status")}>Status</Th>}
              {has("priority") && <Th onClick={() => toggleSort("priority")}>Prioritas</Th>}
              {has("pic") && <Th>PIC</Th>}
              {has("deadline") && <Th>Deadline</Th>}
              {has("scheduled") && <Th onClick={() => toggleSort("scheduledDate")}>Tayang</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr
                key={i.id}
                className={`border-b border-slate-100 hover:bg-slate-50 ${isOverdue(i) ? "bg-red-50/50" : ""}`}
              >
                {has("id") && <td className="px-3 py-2 font-mono text-xs text-slate-400">{i.id}</td>}
                {has("title") && (
                  <td className="cursor-pointer px-3 py-2 font-medium text-slate-800 hover:text-indigo-600" onClick={() => ctrl.open(i.id)}>
                    {i.title}
                  </td>
                )}
                {has("channel") && <td className="px-3 py-2">{i.channel.join(", ")}</td>}
                {has("format") && <td className="px-3 py-2 text-slate-500">{FORMAT_LABELS[i.format]}</td>}
                {has("pillar") && <td className="px-3 py-2 text-slate-500">{i.pillar}</td>}
                {has("stage") && <td className="px-3 py-2 text-slate-600">{STAGE_LABELS[i.stage]}</td>}
                {has("status") && (
                  <td className="px-3 py-2">
                    <select
                      className="rounded border border-transparent bg-transparent text-xs hover:border-slate-300"
                      value={i.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateItem(i.id, { status: e.target.value as Status }, `status → ${STATUS_LABELS[e.target.value as Status]}`)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                )}
                {has("priority") && (
                  <td className="px-3 py-2">
                    <select
                      className="rounded border border-transparent bg-transparent text-xs hover:border-slate-300"
                      value={i.priority}
                      onChange={(e) => updateItem(i.id, { priority: e.target.value as ContentItem["priority"] })}
                    >
                      {["tinggi", "sedang", "rendah"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                )}
                {has("pic") && (
                  <td className="px-3 py-2">
                    <select
                      className="rounded border border-transparent bg-transparent text-xs hover:border-slate-300"
                      value={i.currentPIC ?? ""}
                      onChange={(e) => updateItem(i.id, { currentPIC: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {config.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </td>
                )}
                {has("deadline") && (
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="rounded border border-transparent bg-transparent text-xs hover:border-slate-300"
                      value={i.stageDeadline ?? ""}
                      onChange={(e) => updateItem(i.id, { stageDeadline: e.target.value || undefined })}
                    />
                  </td>
                )}
                {has("scheduled") && <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(i.scheduledDate)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="py-12 text-center text-sm text-slate-400">Tidak ada konten cocok filter.</div>}
      </div>
      <p className="mt-2 text-xs text-slate-400">{rows.length} dari {items.length} konten · klik judul untuk detail · status & lainnya bisa di-edit inline.</p>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th className={`px-3 py-2 font-medium ${onClick ? "cursor-pointer select-none hover:text-slate-700" : ""}`} onClick={onClick}>
      {children}
    </th>
  );
}
