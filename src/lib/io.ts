import type { AppState, ContentItem } from "../types";

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(state: AppState) {
  download(`smm-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json");
}

export function exportCSV(items: ContentItem[]) {
  const cols = [
    "id", "title", "campaign", "channel", "format", "pillar", "contentType",
    "stage", "status", "priority", "currentPIC", "scheduledDate", "isBanked",
    "bankType", "expiryDate", "views", "engagement", "insight",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map((i) =>
    [
      i.id, i.title, i.campaign, i.channel, i.format, i.pillar, i.contentType,
      i.stage, i.status, i.priority, i.currentPIC, i.scheduledDate, i.isBanked,
      i.bankType, i.expiryDate, i.results?.views, i.results?.engagement, i.insight,
    ].map(esc).join(","),
  );
  download(`smm-content-${new Date().toISOString().slice(0, 10)}.csv`, [cols.join(","), ...rows].join("\n"), "text/csv");
}

export function importJSON(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const validNew = Array.isArray(parsed.brands);
        const validLegacy = parsed.config && Array.isArray(parsed.items);
        if (!validNew && !validLegacy) {
          throw new Error("Format tidak valid: butuh { brands } atau { config, items }");
        }
        resolve(parsed as AppState);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
