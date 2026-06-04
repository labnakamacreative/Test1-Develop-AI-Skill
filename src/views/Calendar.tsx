import { useMemo, useState } from "react";
import type { ModalControl } from "../viewTypes";
import { CHANNEL_ICONS, STATUS_COLORS } from "../lib/constants";
import { startOfWeek, todayISO } from "../lib/helpers";
import { useStore } from "../lib/store";
import { Button } from "../components/ui";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function CalendarView({ ctrl }: { ctrl: ModalControl }) {
  const { items, updateItem } = useStore();
  const [mode, setMode] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [dragId, setDragId] = useState<string | null>(null);

  const scheduled = useMemo(() => items.filter((i) => i.scheduledDate), [items]);
  const byDate = useMemo(() => {
    const m = new Map<string, typeof items>();
    for (const i of scheduled) {
      const k = i.scheduledDate!.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    }
    return m;
  }, [scheduled]);

  const days = useMemo(() => {
    if (mode === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
      });
    }
    // month grid (6 weeks)
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [mode, cursor]);

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = todayISO();
  const inMonth = (d: Date) => d.getMonth() === cursor.getMonth();

  const shift = (dir: number) => {
    const d = new Date(cursor);
    if (mode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  const drop = (d: Date) => {
    if (!dragId) return;
    const item = items.find((i) => i.id === dragId);
    if (item) updateItem(item.id, { scheduledDate: iso(d) }, `dijadwalkan ulang → ${iso(d)}`);
    setDragId(null);
  };

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-slate-500">Jadwal tayang. Geser konten untuk re-schedule. Hari kosong = peringatan konsistensi.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 p-0.5 text-sm">
            <button className={`rounded px-3 py-1 ${mode === "month" ? "bg-indigo-600 text-white" : "text-slate-600"}`} onClick={() => setMode("month")}>Bulan</button>
            <button className={`rounded px-3 py-1 ${mode === "week" ? "bg-indigo-600 text-white" : "text-slate-600"}`} onClick={() => setMode("week")}>Minggu</button>
          </div>
          <Button variant="outline" size="sm" onClick={() => shift(-1)}>‹</Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {cursor.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="sm" onClick={() => shift(1)}>›</Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>Hari ini</Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        {DOW.map((d) => (
          <div key={d} className="bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500">{d}</div>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const list = byDate.get(key) ?? [];
          const isToday = key === today;
          const empty = list.length === 0 && (mode === "week" || inMonth(d));
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => drop(d)}
              className={`min-h-24 bg-white p-1.5 ${mode === "month" && !inMonth(d) ? "opacity-40" : ""} ${
                empty ? "bg-amber-50/40" : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={`text-xs ${isToday ? "rounded-full bg-indigo-600 px-1.5 text-white" : "text-slate-400"}`}>
                  {d.getDate()}
                </span>
                {empty && (mode === "week" || inMonth(d)) && <span className="text-[9px] text-amber-500" title="Slot kosong">○</span>}
              </div>
              <div className="space-y-1">
                {list.map((i) => {
                  const c = STATUS_COLORS[i.status];
                  return (
                    <div
                      key={i.id}
                      draggable
                      onDragStart={() => setDragId(i.id)}
                      onClick={() => ctrl.open(i.id)}
                      className={`cursor-pointer truncate rounded border px-1.5 py-0.5 text-[10px] ${c.bg} ${c.text} ${c.border}`}
                      title={i.title}
                    >
                      {i.channel.map((ch) => CHANNEL_ICONS[ch]).join("")} {i.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">Kotak kuning muda = slot tanpa konten terjadwal.</p>
    </div>
  );
}
