# Admin Users Management — Onigiroku

Panduan fitur **Users Management** di dashboard admin (`/admin/users`).

## Ringkasan arsitektur (full stack)

```text
Browser (ADMIN session cookie)
  → Next.js BFF `/api/admin/users*`
       • requireAdminApi (fresh session + role ADMIN)
       • Zod validation
  → Go Gin `/api/admin/users*`   (unversioned — scalable via additive routes)
       • X-Internal-Secret (selalu, termasuk GET)
       • X-Actor-User-Id + X-Actor-Role=ADMIN
       • pgx → PostgreSQL
       • hard delete avatar → SeaweedFS (media.Service)
```

| Lapisan | Tanggung jawab |
| --- | --- |
| **Next.js UI** | `/admin/users` — tabel, search debounce, filter, sort, pagination, modal |
| **Next.js BFF** | Authz cookie session; proxy ke Go via `callGoApiWithActor` |
| **Go domain** | `backend/internal/domain/adminusers` — list/detail/update/soft/restore/hard + purge 30 hari |
| **Better Auth (Next)** | Blokir login inactive/deleted (`assertUserCanAuthenticate` / session hook) |
| **SeaweedFS** | Avatar owned dihapus saat hard delete (idempotent) |

> **Catatan API:** path Go **tanpa** `/v1` / `/v2`. Evolusi kontrak memakai route baru + deprecation, bukan prefix versi.  
> Kontrak Next ↔ Go secara keseluruhan: [INTEGRATION.md](./INTEGRATION.md).

## Endpoint

### Browser → Next (cookie session)

| Method | Path | Fungsi |
| --- | --- | --- |
| `GET` | `/api/admin/users` | List |
| `GET` | `/api/admin/users/:userId` | Detail |
| `PATCH` | `/api/admin/users/:userId` | Update role/status |
| `DELETE` | `/api/admin/users/:userId` | Soft delete |
| `POST` | `/api/admin/users/:userId/restore` | Restore |
| `POST` | `/api/admin/users/:userId/hard-delete` | Hard delete |

### Next → Go (internal, port API)

Path sama secara semantik: `/api/admin/users*`.

Header wajib ke Go: `X-Internal-Secret`, `X-Actor-User-Id`, `X-Actor-Role: ADMIN`.

## Skema database

Migrasi: `drizzle/0003_user_status_soft_delete.sql`

| Kolom | Arti |
| --- | --- |
| `user.status` | `ACTIVE` \| `INACTIVE` |
| `user.deleted_at` | Soft delete; `NULL` = bukan trash |
| `user.deleted_by` | Admin yang memindahkan ke trash |

## Perilaku bisnis

- Scope `active` / `trash`; search ILIKE name/email; filter role/status; sort; pagination 5–50.
- Purge soft-delete > 30 hari dijalankan idempotent saat list.
- Inactive → revoke sessions; login ditolak (`ACCOUNT_INACTIVE`).
- Soft delete → trash 30 hari; hard delete hanya dari trash + hapus avatar SeaweedFS.
- Self-protection: admin tidak bisa ubah/hapus akun sendiri.

## File penting

| Path | Fungsi |
| --- | --- |
| `backend/internal/domain/adminusers/*` | Service + handler Go |
| `backend/internal/middleware/actor.go` | Internal secret always + admin actor |
| `src/lib/admin/go-users.ts` | Client Next → Go |
| `src/lib/admin/users.ts` | Types + auth assert (Drizzle) |
| `src/app/api/admin/users/*` | BFF routes |
| `src/components/admin/*` | UI |
| `src/messages/{id,en}.json` → `adminUsers` | i18n |

## UI

Workspace content memakai `max-w-[96rem]` + padding `xl:px-10` (selaras Overview / Settings).

| Elemen | Catatan desain |
| --- | --- |
| Role badges | Palet **PRD §13.2** — Student = Info `#1D4ED8`, Super Admin = Charcoal `#434040`; **bukan** brand merah (supaya tidak terbaca sebagai error). Komponen: `src/components/admin/user-badges.tsx` |
| Status badges | Active = Success `#15803D`, Inactive = charcoal soft, Trash = Error `#B91C1C` + indicator dot |
| List | Tab segmented (ink), baris dengan accent kiri per role, tombol Details dengan ikon |
| Detail modal | Hero profil bergradien role, tile overview ber-ikon, footer UX: **bahaya kiri** · **Close + aksi primer kanan** (Save / Restore) |

Komponen: `users-management.tsx`, `user-detail-dialog.tsx`, `user-badges.tsx`.

## Keamanan (hardening)

- BFF: fresh ADMIN session + Origin/Referer check pada mutasi (CSRF)
- Go: actor diverifikasi di DB (`ADMIN` + `ACTIVE` + bukan trash)
- Last-admin guard: tidak bisa demote / soft-delete admin aktif terakhir
- Demote `ADMIN`→`USER` mencabut semua sesi target
- Purge: advisory lock + `LIMIT 50` + delete hanya jika masih expired (aman vs restore)
- Hard delete membersihkan `verification` / `auth_lockout` + avatar SeaweedFS
- Error BFF generik (tidak membocorkan detail internal)

## Operasional

```bash
npm run db:migrate
# Setelah ubah kode Go, restart SATU proses API (jangan dobel port)
npm run dev:api
```
