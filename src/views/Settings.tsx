import { useState } from "react";
import type { Channel, Goal, Industry, Role, TeamMember } from "../types";
import {
  CHANNELS,
  CHANNEL_LABELS,
  GOALS,
  GOAL_LABELS,
  INDUSTRIES,
  INDUSTRY_LABELS,
  ROLES,
  ROLE_LABELS,
} from "../lib/constants";
import { industryDefaults, recommendConfig } from "../lib/helpers";
import { useStore } from "../lib/store";
import { Button, Card, Field, inputCls } from "../components/ui";

export function Settings() {
  const { config, updateConfig, resetSeed } = useStore();
  const [rec, setRec] = useState<ReturnType<typeof recommendConfig> | null>(null);

  const toggleArr = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const setMemberCountRec = (members: TeamMember[]) => {
    const r = recommendConfig(members.filter((m) => m.active).length);
    setRec(r);
  };

  const updateMember = (id: string, patch: Partial<TeamMember>) => {
    const members = config.members.map((m) => (m.id === id ? { ...m, ...patch } : m));
    updateConfig({ members });
    setMemberCountRec(members);
  };

  const addMember = () => {
    const id = "u" + (Date.now() % 100000);
    const members = [...config.members, { id, name: "Anggota baru", roles: ["smo" as Role], active: true }];
    updateConfig({ members });
    setMemberCountRec(members);
  };

  const removeMember = (id: string) => {
    const members = config.members.filter((m) => m.id !== id);
    updateConfig({ members });
    setMemberCountRec(members);
  };

  const applyIndustry = (industry: Industry) => {
    const d = industryDefaults(industry);
    updateConfig({
      industry,
      defaultTrendExpiryDays: d.defaultTrendExpiryDays,
      rolesEnabled: Array.from(new Set([...config.rolesEnabled, ...d.rolesToEnable])),
    });
  };

  return (
    <div className="max-w-3xl">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Konfigurasi brand. Satu sistem, perilaku menyesuaikan lewat config (tanpa tier).</p>
      </header>

      {rec && (
        <Card className="mb-4 border-indigo-200 bg-indigo-50 p-4">
          <div className="text-sm font-medium text-indigo-800">Rekomendasi config untuk {config.members.filter((m) => m.active).length} anggota aktif</div>
          <p className="mt-1 text-xs text-indigo-700">{rec.label}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => { updateConfig({ approvalEnabled: rec.approvalEnabled, handoffTrackingEnabled: rec.handoffTrackingEnabled, roleBasedViewsEnabled: rec.roleBasedViewsEnabled }); setRec(null); }}>
              Terapkan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRec(null)}>Abaikan</Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {/* Brand info */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Info Brand</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama brand">
              <input className={inputCls} value={config.brandName} onChange={(e) => updateConfig({ brandName: e.target.value })} />
            </Field>
            <Field label="Industri" hint="Mengubah default expiry & panel yang ditonjolkan">
              <select className={inputCls} value={config.industry} onChange={(e) => applyIndustry(e.target.value as Industry)}>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{INDUSTRY_LABELS[i]}</option>)}
              </select>
            </Field>
            <Field label="Brand guideline URL">
              <input className={inputCls} value={config.brandGuidelineUrl ?? ""} onChange={(e) => updateConfig({ brandGuidelineUrl: e.target.value })} />
            </Field>
          </div>
          <div className="mt-3">
            <span className="mb-1 block text-xs font-medium text-slate-600">Goals (multi)</span>
            <div className="flex flex-wrap gap-1.5">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => updateConfig({ primaryGoals: toggleArr<Goal>(config.primaryGoals, g) })}
                  className={`rounded-full border px-2.5 py-1 text-xs ${config.primaryGoals.includes(g) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-500"}`}
                >
                  {GOAL_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <span className="mb-1 block text-xs font-medium text-slate-600">Channel aktif</span>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateConfig({ channels: toggleArr<Channel>(config.channels, c) })}
                  className={`rounded-full border px-2.5 py-1 text-xs ${config.channels.includes(c) ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-500"}`}
                >
                  {CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Behaviour toggles */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Perilaku Sistem</h2>
          <div className="space-y-2">
            {([
              ["approvalEnabled", "Approval Inbox aktif", "Konten KOL/affiliate/ads butuh persetujuan."],
              ["handoffTrackingEnabled", "Handoff tracking", "Lacak PIC per tahap + deadline tahap."],
              ["roleBasedViewsEnabled", "My Queue (role-based view)", "Tiap orang punya antrian tugas."],
            ] as const).map(([key, label, hint]) => (
              <label key={key} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2">
                <input type="checkbox" checked={config[key]} onChange={(e) => updateConfig({ [key]: e.target.checked } as any)} />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-slate-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        {/* Members */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tim & Role ({config.members.filter((m) => m.active).length} aktif)</h2>
            <Button size="sm" variant="outline" onClick={addMember}>+ Anggota</Button>
          </div>
          <div className="space-y-2">
            {config.members.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-100 p-2">
                <div className="flex items-center gap-2">
                  <input className={`${inputCls} flex-1`} value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} />
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input type="checkbox" checked={m.active} onChange={(e) => updateMember(m.id, { active: e.target.checked })} /> aktif
                  </label>
                  <button className="text-xs text-red-500 hover:underline" onClick={() => removeMember(m.id)}>hapus</button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => updateMember(m.id, { roles: toggleArr<Role>(m.roles, r) })}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${m.roles.includes(r) ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pillars */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Content Pillars</h2>
          <div className="space-y-2">
            {config.pillars.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className={`${inputCls} w-40`}
                  value={p.name}
                  onChange={(e) => {
                    const pillars = [...config.pillars];
                    pillars[idx] = { ...p, name: e.target.value };
                    updateConfig({ pillars });
                  }}
                />
                <input
                  className={`${inputCls} flex-1`}
                  value={p.description}
                  onChange={(e) => {
                    const pillars = [...config.pillars];
                    pillars[idx] = { ...p, description: e.target.value };
                    updateConfig({ pillars });
                  }}
                />
                <button className="text-xs text-red-500" onClick={() => updateConfig({ pillars: config.pillars.filter((_, i) => i !== idx) })}>✕</button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => updateConfig({ pillars: [...config.pillars, { name: "Pillar baru", description: "" }] })}>+ Pillar</Button>
          </div>
        </Card>

        {/* Bank params */}
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Parameter Bank</h2>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min sehat" hint="kebutuhan ~1 minggu">
              <input type="number" className={inputCls} value={config.bankHealthyMin} onChange={(e) => updateConfig({ bankHealthyMin: Number(e.target.value) })} />
            </Field>
            <Field label="Max sehat" hint="kebutuhan ~2 minggu">
              <input type="number" className={inputCls} value={config.bankHealthyMax} onChange={(e) => updateConfig({ bankHealthyMax: Number(e.target.value) })} />
            </Field>
            <Field label="Trend expiry (hari)">
              <input type="number" className={inputCls} value={config.defaultTrendExpiryDays} onChange={(e) => updateConfig({ defaultTrendExpiryDays: Number(e.target.value) })} />
            </Field>
          </div>
        </Card>

        <Card className="border-red-100 p-4">
          <h2 className="mb-2 text-sm font-semibold text-red-600">Zona Bahaya</h2>
          <p className="mb-2 text-xs text-slate-500">Reset ke data contoh akan menghapus semua konten saat ini.</p>
          <Button variant="danger" size="sm" onClick={() => confirm("Reset semua data ke contoh awal?") && resetSeed()}>Reset ke data contoh</Button>
        </Card>
      </div>
    </div>
  );
}
