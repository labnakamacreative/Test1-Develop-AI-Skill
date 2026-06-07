# Social Media Management Dashboard (All-in-One, In-House)

Workflow engine untuk tim konten in-house: satu konten dikelola dari **brief → analisis**
dalam satu sistem terhubung. Dibangun sesuai *functional & technical spec*.

> **Prinsip inti:** satu konten = satu entitas (`ContentItem`). Semua tampilan (Board, Calendar,
> Bank, Queue, Analytics) adalah **turunan/filter dari satu koleksi yang sama** — tidak ada
> duplikasi data (single source of truth).

## Stack

- **React 18 + TypeScript + Vite**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Penyimpanan lokal** via lapisan abstraksi `DataStore` (localStorage di v1)
- **Tanpa dependency tambahan** untuk drag-and-drop (HTML5 native) maupun chart (SVG/CSS bars)

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check (tsc) + build produksi ke dist/
npm run preview  # preview hasil build
```

Saat pertama dibuka, app memuat **data contoh** (6 konten + config brand default). Semua perubahan
otomatis tersimpan ke localStorage. Reset tersedia di **Settings → Zona Bahaya**.

## Struktur

```
src/
  types.ts              # ContentItem, BrandConfig, enum (mirror spec §2 & §3)
  lib/
    constants.ts        # label, warna status, daftar stage/role/goal/industri
    helpers.ts          # logika bisnis: brief gate, banking, expiry, rekomendasi config, dst.
    store.tsx           # DataStore (abstraksi §9) + React context (single source of truth)
    seed.ts             # config & konten contoh
    io.ts               # export/import JSON, export CSV
  components/           # Sidebar, ContentModal (editor), ContentCard, FilterBar, ui primitives
  views/                # Dashboard, Board, Calendar, Bank, Pipeline, MyQueue, Analytics,
                        # ApprovalInbox, Settings
```

### Mengganti penyimpanan (v2)

`DataStore` di `src/lib/store.tsx` adalah interface `load()/save()`. Implementasi v1 memakai
localStorage. Untuk menyambung ke backend (Supabase/Postgres/dll), buat adapter baru yang
memenuhi interface yang sama — UI tidak perlu diubah.

## Fitur (sesuai Acceptance Criteria §10)

| # | Kriteria | Lokasi |
|---|----------|--------|
| 1 | CRUD Content Item dengan seluruh field §2 | `ContentModal`, `store` |
| 2 | 11 tahap + activityLog | `ContentModal` (stage bar & tab Log) |
| 3 | Board kanban drag-and-drop + alarm deadline | `views/Board` |
| 4 | Calendar terjadwal + drag re-schedule + slot kosong | `views/Calendar` |
| 5 | Bank evergreen/trend + countdown + health | `views/Bank` |
| 6 | Pipeline master: filter/sort/search + inline edit | `views/Pipeline` |
| 7 | Brief Gate (cegah masuk produksi tanpa brief) + override + log | `helpers.isBriefComplete`, Board/Modal/Queue |
| 8 | Banking logic: expiry otomatis → status `expired`, jadwalkan-dari-bank | `helpers.sweepExpiry`, `views/Bank` |
| 9 | Approval Inbox (approve/revisi, SLA, revisionCount) | `views/ApprovalInbox` |
| 10 | My Queue per PIC | `views/MyQueue` |
| 11 | Analytics + insight→ide | `views/Analytics` |
| 12 | Settings: edit BrandConfig + auto-rekomendasi per jumlah member | `views/Settings` |
| 13 | Goal-agnostic: field/metrik menyesuaikan `primaryGoals` | `helpers.showSalesFields`, Modal/Analytics/Dashboard |
| 14 | Adaptasi industri: default & panel menyesuaikan `industry` | `helpers.industryDefaults`, Settings |
| 15 | Single source of truth | `store` (satu koleksi `items`) |
| 16 | Export/Import JSON (+ Export CSV) | `lib/io`, Pipeline header |

## Asumsi & keputusan teknis (sesuai instruksi spec)

- **"Login" disederhanakan**: tidak ada autentikasi nyata. User aktif dipilih lewat dropdown di
  sidebar (muncul saat `roleBasedViewsEnabled`) untuk menyalakan My Queue & Approval Inbox.
- **Drag-and-drop** memakai HTML5 native (tanpa library) agar dependency minimal.
- **Chart** Analytics memakai bar SVG/CSS sederhana, bukan library chart.
- **Expiry sweep** (§5.4) dijalankan sekali saat app dibuka (bukan cron) — konten trend yang
  lewat `expiryDate` otomatis berstatus `expired`.
- **Brief Gate** memblokir perpindahan ke tahap produksi (`copywriting/take/design/editing`) bila
  brief belum lengkap; bisa di-override dengan konfirmasi dan tercatat di `activityLog`.
- **Approval otomatis** diwajibkan untuk `contentType` ∈ {kol, affiliate, ads} saat
  `approvalEnabled` (konfigurabel di Settings).
- **Reviewer**: struktur data `reviewers[]` tetap array (siap multi-level), namun UI fokus pada
  single reviewer per konten untuk kesederhanaan v1.
- **localStorage** dipakai karena ini aplikasi proyek mandiri (Claude Code), bukan artifact
  Claude.ai — sesuai catatan §9.
- **Goal `community`** memunculkan metrik komentar; metrik sales/leads (linkClicks, conversions)
  hanya muncul bila goal sales/leads aktif (§8).
