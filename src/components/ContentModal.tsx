import { useEffect, useMemo, useState } from "react";
import type { Channel, ContentFormat, ContentItem, ContentType, Priority, Stage, Status } from "../types";
import {
  CHANNELS,
  CHANNEL_LABELS,
  CONTENT_TYPES,
  FORMATS,
  FORMAT_LABELS,
  PRIORITIES,
  STAGES,
  STAGE_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "../lib/constants";
import {
  addDays,
  isBriefComplete,
  isProductionStage,
  memberName,
  nextStage,
  shouldRequireApproval,
  suggestedStatusForStage,
  todayISO,
} from "../lib/helpers";
import { useStore } from "../lib/store";
import { Button, Field, StatusBadge, inputCls } from "./ui";

interface Props {
  itemId: string | null; // null = new
  onClose: () => void;
}

export function ContentModal({ itemId, onClose }: Props) {
  const { items, config, createItem, updateItem, deleteItem } = useStore();
  const existing = useMemo(() => items.find((i) => i.id === itemId) ?? null, [items, itemId]);

  const [draft, setDraft] = useState<ContentItem | null>(null);
  const [tab, setTab] = useState<"detail" | "brief" | "produksi" | "hasil" | "log">("detail");
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    if (itemId === null) {
      // create immediately so we have a stable object, then edit it
      const created = createItem();
      setDraft(created);
    } else if (existing) {
      setDraft({ ...existing });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  // keep draft in sync if the underlying item changes elsewhere (rare)
  useEffect(() => {
    if (existing && draft && existing.id === draft.id && existing.updatedAt !== draft.updatedAt) {
      // do not clobber unsaved edits; only sync activity log
      setDraft((d) => (d ? { ...d, activityLog: existing.activityLog } : d));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.updatedAt]);

  if (!draft) return null;

  const set = <K extends keyof ContentItem>(key: K, value: ContentItem[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = (extraAction?: string) => {
    if (!draft) return;
    const needs = shouldRequireApproval(draft, config);
    const patch: Partial<ContentItem> = {
      ...draft,
      needsApproval: needs || draft.needsApproval,
      approvalStatus:
        needs && draft.approvalStatus === "tidak_perlu" ? "pending" : draft.approvalStatus,
    };
    updateItem(draft.id, patch, extraAction);
  };

  const toggleChannel = (c: Channel) => {
    const has = draft.channel.includes(c);
    const next = has ? draft.channel.filter((x) => x !== c) : [...draft.channel, c];
    set("channel", next.length ? next : draft.channel);
  };

  // ----- Stage advancement w/ Brief Gate + handoff (§5.2, §5.3) -----
  const advance = () => {
    const ns = nextStage(draft.stage);
    if (!ns) return;
    if (isProductionStage(ns) && !isBriefComplete(draft)) {
      setWarn(
        "Brief belum lengkap (objective / key message / reference). Ini penyebab utama revisi. Lengkapi dulu, atau paksa lanjut.",
      );
      return;
    }
    applyStageChange(ns);
  };

  const applyStageChange = (ns: Stage, forced = false) => {
    const patch: Partial<ContentItem> = {
      stage: ns,
      status: suggestedStatusForStage(ns, draft),
    };
    if (config.handoffTrackingEnabled) {
      const nextPIC = draft.assignments[ns];
      if (nextPIC) {
        patch.currentPIC = nextPIC;
        patch.receivedAt = new Date().toISOString();
      }
    }
    setDraft((d) => (d ? { ...d, ...patch } : d));
    updateItem(
      draft.id,
      patch,
      `${forced ? "[paksa] " : ""}tahap: ${STAGE_LABELS[draft.stage]} → ${STAGE_LABELS[ns]}`,
    );
    setWarn(null);
  };

  const handleDelete = () => {
    if (confirm(`Hapus konten "${draft.title}"? Tindakan ini tidak bisa dibatalkan.`)) {
      deleteItem(draft.id);
      onClose();
    }
  };

  const briefOk = isBriefComplete(draft);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => { save(); onClose(); }}>
      <div
        className="my-4 w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                {draft.id}
              </span>
              <StatusBadge status={draft.status} />
            </div>
            <input
              className="mt-2 w-full border-none bg-transparent text-lg font-semibold outline-none"
              value={draft.title}
              placeholder="Judul / angle konten…"
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <button onClick={() => { save(); onClose(); }} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        {/* stage progress bar */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 py-2 thin-scroll">
          {STAGES.map((s) => {
            const active = s === draft.stage;
            const passed = STAGES.indexOf(s) < STAGES.indexOf(draft.stage);
            return (
              <button
                key={s}
                onClick={() => { set("stage", s); set("status", suggestedStatusForStage(s, draft)); }}
                className={`whitespace-nowrap rounded px-2 py-1 text-xs ${
                  active
                    ? "bg-indigo-600 text-white"
                    : passed
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-400 hover:bg-slate-200"
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            );
          })}
        </div>

        {warn && (
          <div className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            ⚠️ {warn}
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setWarn(null)}>Batal</Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  const ns = nextStage(draft.stage);
                  if (ns) applyStageChange(ns, true);
                }}
              >
                Paksa lanjut (dicatat)
              </Button>
            </div>
          </div>
        )}

        {/* tabs */}
        <div className="flex gap-1 border-b border-slate-200 px-4 pt-2">
          {(["detail", "brief", "produksi", "hasil", "log"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-lg px-3 py-2 text-sm capitalize ${
                tab === t ? "border-b-2 border-indigo-600 font-medium text-indigo-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "brief" ? `Brief ${briefOk ? "✓" : "•"}` : t}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4 thin-scroll">
          {tab === "detail" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Project / Campaign">
                <input className={inputCls} value={draft.campaign ?? ""} onChange={(e) => set("campaign", e.target.value)} />
              </Field>
              <Field label="Pillar">
                <select className={inputCls} value={draft.pillar} onChange={(e) => set("pillar", e.target.value)}>
                  {config.pillars.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Channel (multi)">
                <div className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleChannel(c)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        draft.channel.includes(c)
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {CHANNEL_LABELS[c]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Format">
                <select className={inputCls} value={draft.format} onChange={(e) => set("format", e.target.value as ContentFormat)}>
                  {FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
                </select>
              </Field>
              <Field label="Content Type">
                <select className={inputCls} value={draft.contentType} onChange={(e) => set("contentType", e.target.value as ContentType)}>
                  {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Prioritas">
                <select className={inputCls} value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value as Status)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </Field>
              <Field label="Deadline tahap ini">
                <input type="date" className={inputCls} value={draft.stageDeadline ?? ""} onChange={(e) => set("stageDeadline", e.target.value || undefined)} />
              </Field>
              <Field label="PIC saat ini">
                <select className={inputCls} value={draft.currentPIC ?? ""} onChange={(e) => set("currentPIC", e.target.value || null)}>
                  <option value="">— belum ditentukan —</option>
                  {config.members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Hook (3 detik pertama)">
                <input className={inputCls} value={draft.hook} onChange={(e) => set("hook", e.target.value)} />
              </Field>
            </div>
          )}

          {tab === "brief" && (
            <div className="space-y-4">
              <div className={`rounded-lg border p-3 text-sm ${briefOk ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {briefOk ? "✓ Brief lengkap — konten boleh masuk produksi." : "• Brief belum lengkap. Brief Gate akan mencegah masuk ke tahap produksi."}
              </div>
              <Field label="Objective (tujuan konten)">
                <textarea className={inputCls} rows={2} value={draft.brief.objective} onChange={(e) => set("brief", { ...draft.brief, objective: e.target.value })} />
              </Field>
              <Field label="Key Message (1 kalimat)">
                <input className={inputCls} value={draft.brief.keyMessage} onChange={(e) => set("brief", { ...draft.brief, keyMessage: e.target.value })} />
              </Field>
              <Field label="Reference (link / deskripsi)">
                <input className={inputCls} value={draft.brief.reference} onChange={(e) => set("brief", { ...draft.brief, reference: e.target.value })} />
              </Field>
            </div>
          )}

          {tab === "produksi" && (
            <div className="space-y-4">
              <Field label="Copy / Script final">
                <textarea className={inputCls} rows={5} value={draft.copy} onChange={(e) => set("copy", e.target.value)} />
              </Field>
              <Field label="Asset links (1 per baris)">
                <textarea
                  className={inputCls}
                  rows={3}
                  value={draft.assetLinks.join("\n")}
                  onChange={(e) => set("assetLinks", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Jadwal tayang (scheduledDate)">
                  <input type="date" className={inputCls} value={draft.scheduledDate ?? ""} onChange={(e) => set("scheduledDate", e.target.value || null)} />
                </Field>
                <Field label="Catatan / kendala">
                  <input className={inputCls} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
                </Field>
              </div>

              {/* Banking */}
              <div className="rounded-lg border border-slate-200 p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={draft.isBanked}
                    onChange={(e) => {
                      const banked = e.target.checked;
                      set("isBanked", banked);
                      if (banked) {
                        set("status", "bank");
                        set("bankedAt", todayISO());
                        if (!draft.bankType) set("bankType", "evergreen");
                      }
                    }}
                  />
                  Simpan ke Content Bank (stok)
                </label>
                {draft.isBanked && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label="Tipe bank">
                      <select
                        className={inputCls}
                        value={draft.bankType ?? "evergreen"}
                        onChange={(e) => {
                          const bt = e.target.value as "evergreen" | "trend";
                          set("bankType", bt);
                          if (bt === "trend" && !draft.expiryDate) {
                            set("expiryDate", addDays(draft.bankedAt ?? todayISO(), config.defaultTrendExpiryDays));
                          }
                          if (bt === "evergreen") set("expiryDate", null);
                        }}
                      >
                        <option value="evergreen">Evergreen</option>
                        <option value="trend">Trend (perlu expiry)</option>
                      </select>
                    </Field>
                    {draft.bankType === "trend" && (
                      <Field label="Expiry date">
                        <input type="date" className={inputCls} value={draft.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value || null)} />
                      </Field>
                    )}
                  </div>
                )}
              </div>

              {/* Approval */}
              {config.approvalEnabled && (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Approval</span>
                    <span className="text-xs text-slate-500">status: {draft.approvalStatus}</span>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.needsApproval} onChange={(e) => set("needsApproval", e.target.checked)} />
                    Perlu approval
                  </label>
                  {draft.needsApproval && (
                    <Field label="Reviewer">
                      <select
                        className={inputCls}
                        value={draft.reviewers[0] ?? ""}
                        onChange={(e) => {
                          set("reviewers", e.target.value ? [e.target.value] : []);
                          if (draft.approvalStatus === "tidak_perlu") set("approvalStatus", "pending");
                        }}
                      >
                        <option value="">— pilih reviewer —</option>
                        {config.members.filter((m) => m.roles.includes("lead") || m.active).map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </Field>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "hasil" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {(["views", "reach", "likes", "comments", "shares", "saves"] as const).map((k) => (
                  <Field key={k} label={k}>
                    <input
                      type="number"
                      className={inputCls}
                      value={draft.results?.[k] ?? ""}
                      onChange={(e) => set("results", { ...draft.results, [k]: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </Field>
                ))}
                {(config.primaryGoals.includes("sales") || config.primaryGoals.includes("leads")) &&
                  (["linkClicks", "conversions"] as const).map((k) => (
                    <Field key={k} label={k}>
                      <input
                        type="number"
                        className={inputCls}
                        value={draft.results?.[k] ?? ""}
                        onChange={(e) => set("results", { ...draft.results, [k]: e.target.value ? Number(e.target.value) : undefined })}
                      />
                    </Field>
                  ))}
              </div>
              <Field label="Insight (1 kalimat pelajaran → input ide berikutnya)">
                <textarea className={inputCls} rows={2} value={draft.insight ?? ""} onChange={(e) => set("insight", e.target.value)} />
              </Field>
            </div>
          )}

          {tab === "log" && (
            <div className="space-y-2">
              {[...draft.activityLog].reverse().map((a, i) => (
                <div key={i} className="flex gap-3 border-b border-slate-100 pb-2 text-sm">
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {new Date(a.timestamp).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-medium text-slate-700">{a.user}</span>
                  <span className="text-slate-600">{a.action}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-4">
          <Button variant="ghost" onClick={handleDelete} className="text-red-600 hover:bg-red-50">Hapus</Button>
          <div className="flex items-center gap-2">
            {nextStage(draft.stage) && (
              <Button variant="outline" onClick={advance}>
                Selesai & lanjut → {STAGE_LABELS[nextStage(draft.stage)!]}
              </Button>
            )}
            <Button onClick={() => { save("disimpan"); onClose(); }}>Simpan</Button>
          </div>
        </div>
        {config.handoffTrackingEnabled && draft.currentPIC && (
          <div className="px-4 pb-3 text-xs text-slate-400">PIC sekarang: {memberName(config, draft.currentPIC)}</div>
        )}
      </div>
    </div>
  );
}
