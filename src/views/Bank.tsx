import { useMemo } from "react";
import type { ModalControl } from "../viewTypes";
import { daysUntil, todayISO } from "../lib/helpers";
import { useStore } from "../lib/store";
import { ContentCard } from "../components/ContentCard";
import { Button, Card, EmptyState, StatCard } from "../components/ui";

export function Bank({ ctrl }: { ctrl: ModalControl }) {
  const { items, config, updateItem } = useStore();

  const banked = useMemo(() => items.filter((i) => i.isBanked), [items]);
  const evergreen = banked.filter((i) => i.bankType !== "trend");
  const trend = banked.filter((i) => i.bankType === "trend");

  // ready-to-use stock = banked & not expired
  const ready = banked.filter((i) => i.status !== "expired").length;
  const health =
    ready < config.bankHealthyMin ? "kurang" : ready > config.bankHealthyMax ? "menumpuk" : "sehat";
  const healthTone = health === "sehat" ? "good" : health === "kurang" ? "bad" : "warn";

  const schedule = (id: string) => {
    updateItem(id, { isBanked: false, scheduledDate: todayISO(), status: "siap" }, "dijadwalkan dari bank");
  };

  const trendSorted = [...trend].sort((a, b) => (daysUntil(a.expiryDate) ?? 999) - (daysUntil(b.expiryDate) ?? 999));

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Content Bank</h1>
        <p className="text-sm text-slate-500">Stok konten siap pakai. Trend punya countdown expiry; evergreen tahan lama.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total stok" value={banked.length} />
        <StatCard label="Siap pakai" value={ready} hint={`target ${config.bankHealthyMin}–${config.bankHealthyMax}`} />
        <StatCard label="Kesehatan bank" value={health} tone={healthTone as any} />
        <StatCard label="Trend aktif" value={trend.filter((i) => i.status !== "expired").length} />
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">🔥 Trend ({trend.length})</h2>
        {trend.length === 0 ? (
          <EmptyState title="Belum ada konten trend di bank" />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {trendSorted.map((item) => {
              const d = daysUntil(item.expiryDate);
              const expiring = d !== null && d <= 7;
              return (
                <Card key={item.id} className={expiring ? "ring-2 ring-orange-300" : ""}>
                  <ContentCard item={item} onClick={() => ctrl.open(item.id)} />
                  <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                    <span className={`text-xs ${item.status === "expired" ? "text-slate-400" : expiring ? "font-semibold text-orange-600" : "text-slate-500"}`}>
                      {item.status === "expired" ? "⌛ Expired" : d !== null && d < 0 ? "Expired" : `⏳ ${d} hari`}
                    </span>
                    {item.status !== "expired" && (
                      <Button size="sm" variant="outline" onClick={() => schedule(item.id)}>Jadwalkan</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">🌲 Evergreen ({evergreen.length})</h2>
        {evergreen.length === 0 ? (
          <EmptyState title="Belum ada konten evergreen di bank" />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {evergreen.map((item) => (
              <Card key={item.id}>
                <ContentCard item={item} onClick={() => ctrl.open(item.id)} />
                <div className="flex justify-end border-t border-slate-100 px-3 py-2">
                  <Button size="sm" variant="outline" onClick={() => schedule(item.id)}>Jadwalkan</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
