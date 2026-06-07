import { useMemo, useState } from "react";
import type { ModalControl } from "../viewTypes";
import { fmtDate, memberName } from "../lib/helpers";
import { useStore } from "../lib/store";
import { ContentCard } from "../components/ContentCard";
import { Button, EmptyState, inputCls } from "../components/ui";

const SLA_HOURS = 24;

export function ApprovalInbox({ ctrl }: { ctrl: ModalControl }) {
  const { items, config, currentUserId, updateItem, can } = useStore();
  const canApprove = can("approve");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const pending = useMemo(
    () =>
      items.filter(
        (i) => i.approvalStatus === "pending" && (i.reviewers.length === 0 || i.reviewers.includes(currentUserId ?? "")),
      ),
    [items, currentUserId],
  );

  const hoursPending = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 3600000);

  const approve = (id: string) => {
    updateItem(id, { approvalStatus: "approved", status: "siap" }, "approved");
  };

  const requestRevision = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    // bounce back to production-related stage
    updateItem(
      id,
      {
        approvalStatus: "revisi",
        status: "revisi",
        revisionCount: item.revisionCount + 1,
        notes: note ? `${item.notes}\n[revisi] ${note}`.trim() : item.notes,
      },
      `revisi diminta${note ? `: ${note}` : ""}`,
    );
    setNoteFor(null);
    setNote("");
  };

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Approval Inbox</h1>
        <p className="text-sm text-slate-500">Konten menunggu persetujuan. SLA {SLA_HOURS} jam.</p>
      </header>

      {pending.length === 0 ? (
        <EmptyState title="Tidak ada konten menunggu approval" />
      ) : (
        <div className="space-y-3">
          {pending.map((item) => {
            const updatedHrs = hoursPending(item.updatedAt);
            const overSLA = updatedHrs > SLA_HOURS;
            return (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-center">
                <div className="w-full md:w-72">
                  <ContentCard item={item} onClick={() => ctrl.open(item.id)} />
                </div>
                <div className="flex-1 text-sm">
                  <div className="text-slate-600">
                    Tipe: <strong>{item.contentType}</strong> · Reviewer: {item.reviewers.map((r) => memberName(config, r)).join(", ") || "siapa saja"}
                  </div>
                  <div className={`mt-1 text-xs ${overSLA ? "font-semibold text-red-600" : "text-slate-400"}`}>
                    ⏱ Pending ~{updatedHrs} jam {overSLA && "· melewati SLA!"}
                  </div>
                  {item.revisionCount > 0 && (
                    <div className="mt-1 text-xs text-pink-600">Sudah {item.revisionCount}× revisi {item.revisionCount >= 2 && "— cek kualitas brief."}</div>
                  )}
                  <div className="mt-1 text-xs text-slate-400">Jadwal: {fmtDate(item.scheduledDate)}</div>

                  {!canApprove ? (
                    <div className="mt-3 text-xs text-amber-700">Hanya Manager ke atas yang bisa approve / minta revisi.</div>
                  ) : noteFor === item.id ? (
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input className={inputCls} placeholder="Catatan revisi…" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
                      <div className="flex gap-2">
                        <Button size="sm" variant="danger" onClick={() => requestRevision(item.id)}>Kirim revisi</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setNoteFor(null); setNote(""); }}>Batal</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => approve(item.id)}>✓ Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => setNoteFor(item.id)}>Minta revisi</Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
