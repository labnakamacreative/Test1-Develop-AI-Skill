import type { ContentItem } from "../types";
import { FORMAT_LABELS, PRIORITY_COLORS } from "../lib/constants";
import { fmtDate, isOverdue, memberName, daysUntil } from "../lib/helpers";
import { useStore } from "../lib/store";
import { ChannelIcons, StatusBadge } from "./ui";

export function ContentCard({
  item,
  onClick,
  draggable,
  onDragStart,
}: {
  item: ContentItem;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const { config } = useStore();
  const overdue = isOverdue(item);
  const expiryDays = item.bankType === "trend" ? daysUntil(item.expiryDate) : null;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition hover:shadow-md ${
        overdue ? "border-red-300 ring-1 ring-red-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-400">{item.id}</span>
        <div className="flex items-center gap-1.5">
          <ChannelIcons channels={item.channel} />
        </div>
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{item.title}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={item.status} />
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{FORMAT_LABELS[item.format]}</span>
        <span className={`text-[10px] font-medium ${PRIORITY_COLORS[item.priority]}`}>● {item.priority}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{config.handoffTrackingEnabled ? memberName(config, item.currentPIC) : item.pillar}</span>
        {item.stageDeadline && (
          <span className={overdue ? "font-semibold text-red-500" : ""}>⏰ {fmtDate(item.stageDeadline)}</span>
        )}
      </div>
      {expiryDays !== null && (
        <div className={`mt-1 text-[11px] ${expiryDays <= 7 ? "font-semibold text-orange-600" : "text-slate-400"}`}>
          {expiryDays < 0 ? "Expired" : `Expiry ${expiryDays} hari`}
        </div>
      )}
      {config.approvalEnabled && item.needsApproval && item.approvalStatus === "pending" && (
        <div className="mt-1 text-[11px] font-medium text-orange-600">⏳ Menunggu approval</div>
      )}
    </div>
  );
}
