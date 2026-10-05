# Onigiroku — Architecture

## Ringkasan

Onigiroku memakai **modular monolith** (sesuai PRD): satu produk, batas domain jelas, siap dipecah ke service jika skala membutuhkannya.

```text
Browser
  │
  ▼
Next.js (UI + BFF + Better Auth + email)
  │                 │ trusted HTTP
  │ Drizzle (auth)  │ INTERNAL_API_SECRET (+ X-Actor-* bila perlu)
  ▼                 ▼
PostgreSQL ◄──── Golang Gin API
  ▲              (media, admin users, login-history, content/materials;
Redis            stub: assessment, analytics, billing)
  │
SeaweedFS ◄── nginx gateway (basic auth server-side only)
Xendit (nanti: webhook → Go publik atau Next proxy; entitlement belum wired)
Nodemailer → SMTP (dari Next saja)
```

Kontrak detail Next ↔ Go: **[INTEGRATION.md](./INTEGRATION.md)**.

## Pembagian tanggung jawab

### Next.js (`src/`)

- Landing, learner UI, admin UI (App Router + `[locale]`)
- Better Auth (`/api/auth/*`) — identity & session (lihat [AUTH.md](./AUTH.md))
- Halaman auth: login / register / forgot / reset / verify-email; dashboard per role (`USER`→`/dashboard`, `ADMIN`→`/admin`)
- Route group `(app)` memakai **AppShell** tersendiri (sidebar collapsible, topbar + breadcrumb, footer workspace) — terpisah dari landing `SiteHeader` / `SiteFooter`
- Drizzle schema/migrations untuk auth (+ domain tables bertahap)
- Validasi Zod di trust boundary web + CSRF Origin/Referer pada mutasi BFF
- Email transactional modular (`src/lib/email/templates/`) — verifikasi, reset, notifikasi password
- BFF domain: `/api/admin/users*`, `/api/admin/materials*`, `/api/materials*`, `/api/settings/*`, `/api/media/*`, `/api/health` → `callGoApi` / `callGoApiWithActor`
- i18n ID/EN (`next-intl`)

### Go Gin (`backend/`)

- Domain API berperforma tinggi di path **unversioned** `/api/*` (bukan `/api/v1`)
- **Live:** media (presign/delete), admin users, settings/login-history, learning materials / news (`content`)
- **Stub (belum BFF):** catalog, assessment/attempts, analytics, billing/webhooks (Xendit prep only)
- Dipanggil dari Next BFF via `callGoApi` + `X-Internal-Secret` (+ `X-Actor-*` untuk trusted routes)
- Identity (Better Auth session/password/email) tetap di Next — domain data & storage orchestration di Go
- Middleware: request ID, CORS, recovery, security headers, Redis rate limit, actor verify
- Envelope JSON konsisten + typed errors (EN/ID)
- Health `/health` + readiness `/ready`

Media lifecycle (create / replace / delete tanpa orphan): [STORAGE.md](./STORAGE.md).  
Account settings (profil, password, login history): [SETTINGS.md](./SETTINGS.md).  
Admin users (list/role/status/soft-hard delete): [ADMIN_USERS.md](./ADMIN_USERS.md).  
Learning materials + News CMS: [LEARNING_MATERIALS.md](./LEARNING_MATERIALS.md).

### Shared infrastructure

| Resource | Pemakaian |
| --- | --- |
| PostgreSQL | Source of truth |
| Redis | Rate limit, cache, distributed lock, job queue |
| SeaweedFS | Object storage (media soal, audio, aset CMS) |
| Xendit | Payment IDR (menggantikan Midtrans di baseline implementasi) |

> **Catatan PRD:** dokumen PRD menyebut Midtrans. Instruksi produk terkini memakai **Xendit**. Dokumentasi dan kode mengikuti Xendit.

## Struktur repo

```text
onigiroku-app/
  src/                 # Next.js App Router
    app/[locale]/     # UI berbahasa
    app/api/           # Auth, health, admin, settings, media BFF
    components/        # UI + landing + admin + settings
    lib/               # auth, api/go-client, admin, settings, db, email, redis, storage, env, logger
    i18n/ + messages/  # localization
    stores/            # Zustand
  backend/             # Go Gin API
  drizzle/             # SQL migrations (generated)
  public/images/       # logo brand
  docs/                # manual & PRD
```

## Security baseline (awal)

- Secrets hanya di server env
- Cookie session Better Auth (secure attributes di production)
- Zod validation untuk input publik
- CSRF Origin/Referer pada mutasi BFF (cookie session)
- Parameterized queries (Drizzle / pgx)
- Health token di production
- Internal API secret + actor DB verify untuk Next ↔ Go trusted routes
- Security headers di Next + Go
- Tidak log password, token, atau jawaban assessment
- Lihat [SECURITY.md](./SECURITY.md) + [INTEGRATION.md](./INTEGRATION.md)

## Error handling

### Web

- Structured JSON logger (`src/lib/logger`)
- Toast Sonner untuk feedback UI
- API health degraded status tanpa membocorkan detail internal

### Go

- `AppError` dengan `code` + pesan EN/ID
- Envelope:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "..." },
  "meta": { "requestId": "..." }
}
```

## Observability (rencana)

- Correlation / request ID di setiap request Go (sudah)
- Structured logs web + Go (sudah baseline)
- Metrics/tracing & error monitoring ditambahkan sebelum production traffic

## Deployment shape

1. **Web**: Vercel / Node host / container Next.js (`npm run build` → `npm start`)
2. **API**: container/binary Go (`npm run build:api`) di belakang reverse proxy
3. **Postgres / Redis / SeaweedFS**: managed atau VPS private network
4. Env terpisah: development, staging, production (inject di host; jangan commit `.env`)

## Git hygiene

`.gitignore` mengecualikan artefak besar dan sensitif (`node_modules`, `.next`, `backend/bin`, uploads, media besar, dump DB/Redis, secrets) sambil mempertahankan sumber, lockfile, `go.sum`, aset brand di `public/images`, dan `.env.example` agar CI/deploy tetap bisa membangun aplikasi dari repo.
