# Next.js ↔ Go integration contract

Kontrak sinkronisasi **end-to-end** antara frontend (Next.js) dan domain API (Go Gin). Dokumen ini adalah sumber kebenaran batas tanggung jawab, header, path, dan env agar local development serta production tetap konsisten.

## Prinsip pemisahan

| Lapisan | Dimiliki oleh | Contoh |
| --- | --- | --- |
| Identity & session | **Next.js + Better Auth** | login/register, verify email, reset/change password, Google OAuth, cookie session |
| Email transactional | **Next.js + Nodemailer** | verification, reset, password-changed, existing-account notice |
| Domain data & orchestration | **Go Gin** | admin users CRUD, login-history query, media presign/delete, (nanti) catalog/assessment/analytics/billing |
| Object storage credentials | **Server only** (Go media + Next BFF PUT/proxy) | SeaweedFS via nginx basic-auth — **tidak** pernah di browser |
| Shared DB / Redis | Keduanya | PostgreSQL source of truth; Redis rate-limit / locks |

**Browser tidak memanggil Go langsung.** Semua traffic user → Next (cookie) → BFF → `callGoApi` / `callGoApiWithActor` → Go (`X-Internal-Secret`).

Path API **unversioned**: `/api/*` (bukan `/api/v1`). Evolusi: route baru + deprecation, bukan prefix versi.

## Matriks fitur (status saat ini)

| Fitur | Browser path | Next BFF | Go domain | Catatan |
| --- | --- | --- | --- | --- |
| Auth (semua alur) | `/login`, `/register`, … | `/api/auth/*` | — | Next-only by design |
| Email verify / reset / password notice | — | Better Auth + `src/lib/email/*` | — | Next-only |
| Health aggregate | — | `GET /api/health` | `GET /ready` | Next mengecek DB, Redis, `checkGoReady()` |
| Admin users | `/admin/users` | `/api/admin/users*` | `/api/admin/users*` | Actor ADMIN + CSRF mutasi |
| Settings profile name | `/settings` | `PATCH /api/settings/profile` | — | Better Auth `updateUser` |
| Settings avatar | `/settings` | `POST`/`DELETE /api/settings/profile` | `/api/media/presign` + `/api/media/delete` | Hybrid; CSRF; SeaweedFS lifecycle |
| Settings password | `/settings` | `POST /api/settings/password` | — | Better Auth + email; CSRF |
| Login history | `/settings` | `GET /api/settings/login-history` | `/api/settings/login-history` | Actor + current session token |
| Media proxy (read) | `<img src="/api/media/…">` | `GET /api/media/[...key]` | — | Next → SeaweedFS (basic auth server-side) |
| Learning materials (admin) | `/admin/materials` | `/api/admin/materials*` | `/api/admin/materials*` | Actor ADMIN + CSRF; TipTap JSON |
| Student materials | `/dashboard/materials` | `/api/materials*` | `/api/materials*` | Actor USER/ADMIN; STUDENT+PUBLISHED |
| Public news | `/news` | RSC → Go | `/api/news*` | Secret only; PUBLIC+PUBLISHED |
| Catalog / assessment / analytics / billing | — | *(stub)* | Stub routes di Go | Billing Xendit belum wired ke materials |

## Header kontrak Next → Go

| Header | Kapan | Fungsi |
| --- | --- | --- |
| `X-Internal-Secret` | Semua panggilan trusted; mutating `/api/*` | Shared secret (`INTERNAL_API_SECRET`) |
| `X-Actor-User-Id` | Admin users, materials, login-history | User yang diwakili BFF (diverifikasi di DB oleh Go) |
| `X-Actor-Role` | Admin (`ADMIN`); student materials / settings opsional | Hint; Go tetap verify role/status di PostgreSQL |
| `X-Current-Session-Token` | Login history | Menandai baris “sesi saat ini” |
| `X-Health-Token` / `Authorization: Bearer` | Health/ready (prod) | `HEALTH_CHECK_TOKEN` |

Implementasi client: `src/lib/api/go-client.ts`
- `callGoApi` / `callGoApiWithActor` / `checkGoReady`
- `src/lib/admin/go-users.ts`
- `src/lib/api/go-materials.ts`

- `callGoApi` — secret + timeout (default 15s)
- `callGoApiWithActor` — secret + actor headers
- `checkGoReady` — probe `GET {API}/ready`

Domain wrappers:

- `src/lib/admin/go-users.ts`
- `src/lib/settings/go-settings.ts`
- `src/lib/storage/index.ts` (media)

## CSRF (browser → Next BFF)

Mutasi cookie-authenticated memakai Origin/Referer allowlist (`assertTrustedMutationOrigin`):

- Admin users (semua non-GET)
- Settings profile `PATCH` / `POST` / `DELETE`
- Settings password `POST`

Allowlist dari `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` / `APP_URL`. Production fail-closed jika origin tidak cocok.

## Auth gates yang sinkron dengan domain Go

Go menulis `user.status` / `deleted_at` (admin users). Next memblokir autentikasi terhadap state yang sama:

| Gate | Lokasi Next |
| --- | --- |
| Email sign-in | `assertUserCanAuthenticate` sebelum `/sign-in/email` |
| Session create (termasuk OAuth) | `assertUserIdCanAuthenticate` di `databaseHooks.session.create` |

Kode: `src/lib/admin/users.ts` (read-only assert) + hooks di `src/lib/auth/index.ts`.

Efek bisnis yang harus tetap selaras:

- `INACTIVE` → login ditolak; sesi dicabut (Go revoke saat status diubah)
- Soft-delete → login ditolak; trash 30 hari; purge di Go (advisory lock saat list)
- Hard delete → baris user + avatar SeaweedFS hilang (idempotent)

## Media / SeaweedFS (lifecycle tanpa orphan)

```text
1. Next BFF validasi MIME/size
2. createPresignedUpload → Go POST /api/media/presign  (folder allowlist)
3. Next server PUT ke STORAGE_ENDPOINT (basic auth)
4. Persist URL publik relatif `/api/media/...` (Better Auth / domain)
5. confirmObjectReplacement → Go POST /api/media/delete (key lama)
6. Browser GET /api/media/... → Next proxy → SeaweedFS
```

Aturan:

- **Replace** = key UUID baru, lalu hapus key lama (bukan overwrite in-place)
- **Delete** = hapus object di storage + null-kan referensi di DB
- **Hard delete user** = Go media service menghapus avatar owned
- Idempotent: object sudah tidak ada = sukses
- MIME/size umum (25 MiB) divalidasi di Next storage helper **dan** Go media service; avatar settings lebih ketat (5 MB) di BFF settings

Detail: [STORAGE.md](./STORAGE.md).

## Env parity (local + production)

Satu root `.env` untuk Next dan Go (lihat [ENVIRONMENT.md](./ENVIRONMENT.md)).

| Variable | Dipakai | Wajib selaras |
| --- | --- | --- |
| `DATABASE_URL` | Next + Go | Ya |
| `REDIS_URL` | Next + Go | Ya |
| `INTERNAL_API_SECRET` | Next BFF + Go middleware | Ya (≥16 prod) |
| `HEALTH_CHECK_TOKEN` | Next `/api/health` + Go `/health`/`/ready` | Ya di prod |
| `NEXT_PUBLIC_API_URL` / `API_PORT` | Next → Go base URL | Local default `http://localhost:8080` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` | CORS, CSRF, media public base, auth | Origin HTTPS di prod |
| `STORAGE_*` + `USERNAME_STORAGE` / `PASSWORD_STORAGE` | Go media + Next PUT/proxy | Ya |
| `CORS_ORIGINS` | Go | Harus mencakup origin web |

Local tipikal:

```bash
npm run dev        # Next :3000
npm run dev:api    # Go   :8080
```

Production tipikal:

- Go hanya di **private network** / reverse proxy internal
- Web public → Next; Next memanggil Go lewat URL internal
- Webhook Xendit (nanti): butuh ingress publik ke Go **atau** Next BFF proxy + verifikasi token — jangan mengandalkan `X-Internal-Secret` untuk webhook provider

## Stub domain (belum diintegrasikan ke UI)

Go sudah mendaftarkan placeholder:

- `/api/catalog`, `/api/materials`, …
- `/api/assessments`, `/api/attempts`, …
- `/api/analytics/...`
- `/api/billing/...` (webhook path dikecualikan dari internal secret)

**Belum ada** Next BFF/UI. Saat fitur diaktifkan:

1. Implementasi service Go + test
2. Tambah BFF di `src/app/api/...` dengan session/role + Zod
3. Pakai `callGoApi` / `callGoApiWithActor`
4. Update matriks di dokumen ini

## Checklist sinkron sebelum merge fitur domain baru

- [ ] Ownership jelas (Next-only vs Go domain vs hybrid)
- [ ] BFF memakai `go-client` (bukan query domain ad-hoc di Next kecuali auth assert)
- [ ] Mutasi browser: CSRF origin + fresh session bila privilege-sensitive
- [ ] Go: internal secret (+ actor verify bila multi-tenant / admin)
- [ ] Error envelope `success` / `error.code` dipetakan di BFF tanpa bocor detail internal
- [ ] File storage: replace/delete tanpa orphan
- [ ] Docs terkait (`INTEGRATION`, domain doc, ARCHITECTURE) diperbarui
- [ ] `npm run lint` / typecheck + `go test` / staticcheck untuk area yang disentuh

## Referensi silang

- [ARCHITECTURE.md](./ARCHITECTURE.md) — gambaran sistem
- [AUTH.md](./AUTH.md) — identity & email
- [ADMIN_USERS.md](./ADMIN_USERS.md) — users management
- [SETTINGS.md](./SETTINGS.md) — profil / password / history
- [STORAGE.md](./STORAGE.md) — SeaweedFS
- [GOLANG_BACKEND.md](./GOLANG_BACKEND.md) — panduan Go
- [SECURITY.md](./SECURITY.md) — OWASP / hardening
- [ENVIRONMENT.md](./ENVIRONMENT.md) — variabel env
