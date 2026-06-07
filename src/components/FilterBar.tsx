import { useMemo, useState } from "react";
import type { ContentItem } from "../types";
import { CHANNEL_LABELS, CONTENT_TYPES } from "../lib/constants";
import { useStore } from "../lib/store";

export interface Filters {
  search: string;
  channel: string;
  pillar: string;
  pic: string;
  campaign: string;
  priority: string;
  contentType: string;
}

export const emptyFilters: Filters = {
  search: "",
  channel: "",
  pillar: "",
  pic: "",
  campaign: "",
  priority: "",
  contentType: "",
};

export function applyFilters(items: ContentItem[], f: Filters): ContentItem[] {
  return items.filter((i) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = `${i.id} ${i.title} ${i.hook} ${i.campaign ?? ""} ${i.notes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.channel && !i.channel.includes(f.channel as any)) return false;
    if (f.pillar && i.pillar !== f.pillar) return false;
    if (f.pic && i.currentPIC !== f.pic) return false;
    if (f.campaign && i.campaign !== f.campaign) return false;
    if (f.priority && i.priority !== f.priority) return false;
    if (f.contentType && i.contentType !== f.contentType) return false;
    return true;
  });
}

const sel = "rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm";

export function FilterBar({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const { config, items } = useStore();
  const campaigns = useMemo(
    () => Array.from(new Set(items.map((i) => i.campaign).filter(Boolean))) as string[],
    [items],
  );
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        className={`${sel} min-w-48 flex-1`}
        placeholder="Cari id / judul / hook…"
        value={filters.search}
        onChange={(e) => set("search", e.target.value)}
      />
      {campaigns.length > 0 && (
        <select
          className={`${sel} ${filters.campaign ? "border-indigo-400 text-indigo-700" : "text-slate-600"}`}
          value={filters.campaign}
          onChange={(e) => set("campaign", e.target.value)}
          title="Filter per project"
        >
          <option value="">📁 Semua project</option>
          {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <button className={`${sel} text-slate-600`} onClick={() => setOpen((o) => !o)}>
        Filter {open ? "▲" : "▼"}
      </button>
      {Object.values(filters).some(Boolean) && (
        <button className="text-sm text-indigo-600 hover:underline" onClick={() => setFilters(emptyFilters)}>
          Reset
        </button>
      )}
      {open && (
        <div className="flex w-full flex-wrap gap-2">
          <select className={sel} value={filters.channel} onChange={(e) => set("channel", e.target.value)}>
            <option value="">Semua channel</option>
            {config.channels.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>)}
          </select>
          <select className={sel} value={filters.pillar} onChange={(e) => set("pillar", e.target.value)}>
            <option value="">Semua pillar</option>
            {config.pillars.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <select className={sel} value={filters.pic} onChange={(e) => set("pic", e.target.value)}>
            <option value="">Semua PIC</option>
            {config.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className={sel} value={filters.campaign} onChange={(e) => set("campaign", e.target.value)}>
            <option value="">Semua project</option>
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={sel} value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="">Semua prioritas</option>
            {["tinggi", "sedang", "rendah"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={sel} value={filters.contentType} onChange={(e) => set("contentType", e.target.value)}>
            <option value="">Semua tipe</option>
            {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
