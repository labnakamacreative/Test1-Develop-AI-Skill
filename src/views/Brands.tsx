import { useState } from "react";
import type { Brand, BrandType } from "../types";
import { INDUSTRY_LABELS } from "../lib/constants";
import { useStore } from "../lib/store";
import { Button, Card, Field, inputCls } from "../components/ui";
import type { ViewKey } from "../components/Sidebar";

export function Brands({ setView }: { setView: (v: ViewKey) => void }) {
  const { brands, currentBrandId, switchBrand, createBrand, updateBrandMeta, deleteBrand, can } = useStore();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<BrandType>("eksternal");
  const canCreate = can("createBrand");
  const canManage = can("manageBrand");

  const internal = brands.filter((b) => b.type === "internal");
  const eksternal = brands.filter((b) => b.type === "eksternal");

  const add = () => {
    if (!newName.trim()) return;
    createBrand(newName.trim(), newType);
    setNewName("");
    setView("dashboard");
  };

  return (
    <div className="max-w-4xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Brand / Project</h1>
        <p className="text-sm text-slate-500">Tiap brand adalah dashboard terpisah (konten, tim, analitik sendiri). Pilih untuk berpindah workspace.</p>
      </header>

      {/* create */}
      {!canCreate ? (
        <Card className="mb-5 border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Akun ini (Staff) tidak punya akses membuat brand/project. Hubungi Manager ke atas.
        </Card>
      ) : (
      <Card className="mb-5 p-4">
        <h2 className="mb-2 text-sm font-semibold">Buat brand / project baru</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-48">
            <Field label="Nama brand/project">
              <input className={inputCls} value={newName} placeholder="mis. Azarine, Project X…" onChange={(e) => setNewName(e.target.value)} />
            </Field>
          </div>
          <Field label="Tipe">
            <select className={inputCls} value={newType} onChange={(e) => setNewType(e.target.value as BrandType)}>
              <option value="eksternal">Eksternal</option>
              <option value="internal">Internal</option>
            </select>
          </Field>
          <Button onClick={add} disabled={!newName.trim()}>+ Buat</Button>
        </div>
      </Card>
      )}

      <Group title="Internal" brands={internal} currentBrandId={currentBrandId} switchBrand={switchBrand} setView={setView} updateBrandMeta={updateBrandMeta} deleteBrand={deleteBrand} canDelete={brands.length > 1 && canManage} canManage={canManage} />
      <Group title="Eksternal" brands={eksternal} currentBrandId={currentBrandId} switchBrand={switchBrand} setView={setView} updateBrandMeta={updateBrandMeta} deleteBrand={deleteBrand} canDelete={brands.length > 1 && canManage} canManage={canManage} />
    </div>
  );
}

function Group({
  title,
  brands,
  currentBrandId,
  switchBrand,
  setView,
  updateBrandMeta,
  deleteBrand,
  canDelete,
  canManage,
}: {
  title: string;
  brands: Brand[];
  currentBrandId: string;
  switchBrand: (id: string) => void;
  setView: (v: ViewKey) => void;
  updateBrandMeta: (id: string, patch: { name?: string; type?: BrandType; status?: Brand["status"] }) => void;
  deleteBrand: (id: string) => void;
  canDelete: boolean;
  canManage: boolean;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title} ({brands.length})</h2>
      {brands.length === 0 ? (
        <p className="text-sm text-slate-400">Belum ada brand {title.toLowerCase()}.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {brands.map((b) => {
            const published = b.items.filter((i) => i.results).length;
            const active = b.id === currentBrandId;
            return (
              <Card key={b.id} className={`p-4 ${active ? "ring-2 ring-indigo-400" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      className="w-full border-none bg-transparent text-base font-semibold text-slate-800 outline-none focus:bg-slate-50 disabled:cursor-default"
                      value={b.config.brandName}
                      disabled={!canManage}
                      onChange={(e) => updateBrandMeta(b.id, { name: e.target.value })}
                    />
                    <div className="mt-0.5 text-xs capitalize text-slate-400">
                      {INDUSTRY_LABELS[b.config.industry]} · {b.items.length} konten · {published} ber-hasil
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${b.status === "aktif" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {active ? (
                    <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700">Sedang dibuka</span>
                  ) : (
                    <Button size="sm" onClick={() => { switchBrand(b.id); setView("dashboard"); }}>Buka</Button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBrandMeta(b.id, { status: b.status === "aktif" ? "nonaktif" : "aktif" })}
                    >
                      {b.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBrandMeta(b.id, { type: b.type === "internal" ? "eksternal" : "internal" })}
                    >
                      Pindah ke {b.type === "internal" ? "Eksternal" : "Internal"}
                    </Button>
                  )}
                  {canDelete && (
                    <button
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => confirm(`Hapus brand "${b.config.brandName}" beserta semua kontennya?`) && deleteBrand(b.id)}
                    >
                      hapus
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
