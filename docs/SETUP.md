# Onigiroku — Setup & Development Guide

Panduan setup lengkap untuk development lokal dan persiapan production.

## Prasyarat

| Komponen | Status | Catatan |
| --- | --- | --- |
| Node.js 20.9+ | Wajib | Next.js 16 |
| Go 1.25+ | Wajib untuk API | Gin v1.12 |
| PostgreSQL + pgAdmin | Lokal | Buat DB `onigiroku_db` |
| Redis | WSL / lokal | Rate limit, cache, jobs |
| SeaweedFS + nginx | Docker (WSL) | Gateway `127.0.0.1:8333` |
| npm | Wajib | Orkestrasi script web + API |

## 1. Clone / buka project

```bash
cd onigiroku-app
npm install
```

## 2. Environment (satu file di root)

```bash
cp .env.example .env
```

| File | Pakai untuk |
| --- | --- |
| `.env.example` | Template key saja — **jangan** dipakai sebagai file runtime |
| `.env` | **Primary** secrets & config development (wajib diisi) |
| `.env.local` | Opsional; jangan isi credential yang bentrok dengan `.env` |

Generate secret:

```bash
openssl rand -base64 32
```

Minimal yang harus diisi di **`.env`**: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET` (≥32), `INTERNAL_API_SECRET` (≥16).

Detail: [ENVIRONMENT.md](./ENVIRONMENT.md).

> Jangan buat `backend/.env`. Go API memuat **root `.env`** (primary), lalu `.env.local` hanya untuk key yang masih kosong.

## 3. Database & infrastruktur

```sql
CREATE DATABASE onigiroku_db;
```

```bash
npm run db:push
```

Pastikan Redis dan SeaweedFS gateway (`:8333`) berjalan.

Format Redis di `.env` (dengan password), sesuai `.env.example`:

```text
REDIS_URL="redis://:<redis_password>@localhost:6379"
```

Email transactional memakai logo dari:

```text
EMAIL_LOGO_URL="https://res.cloudinary.com/dz8dtz5ki/image/upload/v1790609932/logo_ozcqba.png"
```

## 4. Menjalankan aplikasi (npm scripts)

Gunakan **dua terminal** (paling jelas saat development):

**Terminal A — Frontend**

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000) (locale default: Indonesia, English: `/en`)

**Terminal B — Backend API**

```bash
npm run dev:api
```

→ [http://localhost:8080](http://localhost:8080) (`GET /health`, `GET /api/v1/catalog`)

### Satu terminal (opsional)

```bash
npm run dev:all
```

Menjalankan web + API bersamaan via `concurrently` (Ctrl+C menghentikan keduanya).

### Ringkasan script

| Script | Fungsi |
| --- | --- |
| `npm run preflight` | Cek env dasar (warning, non-blocking untuk web) |
| `npm run dev` / `dev:web` | Next.js **Webpack** (default — hindari bug CSS HMR Turbopack) |
| `npm run dev:turbo` | Next.js Turbopack (opsional, lebih cepat) |
| `npm run dev:api` | Gin API (cross-platform, load root `.env`) |
| `npm run dev:all` | Web + API sekaligus |
| `npm run build` | Build production Next.js |
| `npm run build:api` | Compile binary Go → `backend/bin/api` |
| `npm run build:all` | Build web + API |
| `npm run start` | Jalankan Next.js production |
| `npm run lint` / `typecheck` | Quality gate |
| `npm run db:*` | Drizzle generate / migrate / push / studio |
| `npm run api:tidy` / `api:test` | Go module tidy & tests |

Implementasi launcher API: `scripts/dev-api.mjs` (cek Go terpasang, env wajib, graceful signal).

## 5. Proxy i18n (Next.js 16)

Locale routing memakai `src/proxy.ts` (menggantikan konvensi `middleware` yang deprecated).

## 5b. Landing announcements & 404

- **Announcements:** slider max 5 di home (`#announcements`), seed di `src/messages/{locale}.json`; visual default = ikon Lucide (tanpa PNG lokal). Optional `imageSrc` dari CMS nanti. Lihat [CMS.md](./CMS.md).
- **404:** `src/app/[locale]/not-found.tsx` + catch-all `[...rest]` menampilkan halaman branded; root `src/app/not-found.tsx` sebagai fallback.
- **Jangan** menjalankan ulang `npm run dev:api` jika port `:8080` sudah aktif — cukup refresh browser / hard reload frontend.
- Jika browser log `No link element found for chunk …css`: bug HMR CSS Turbopack. Default `npm run dev` memakai Webpack + font self-hosted. Hapus `.next` lalu restart **hanya** frontend jika cache stale.

## 5c. Autentikasi (Better Auth)

- Halaman: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`
- Dashboard: `/dashboard` (Peserta/`USER`), `/admin` (Super Admin/`ADMIN`), `/settings`
- Workspace chrome: AppShell tersendiri (sidebar collapsible hover-toggle, breadcrumb, tombol public site, avatar) — terpisah dari navbar/footer landing; palette `--workspace-*` lebih lembut untuk sesi panjang
- Locale switcher di dashboard topbar: dropdown di mobile, pills di desktop
- Navbar authenticated di **landing** (desktop): avatar dropdown (name, email, **role badge**, Dashboard, My settings, Sign out + modal)
- Navbar authenticated di **landing** (mobile): tanpa avatar — akun (role, Dashboard, Settings, Sign out) masuk panel hamburger
- Remember me di login: isi ulang email/password selama 1 hari (localStorage perangkat); tanpa teks hint di bawah checkbox
- Logout redirect → `/login` (bukan home publik)
- Guest-only auth pages memakai `redirectIfAuthenticated`; app pages memakai `requireSession` / `requireRole`
- Email verifikasi & reset memakai SMTP (`SMTP_*`) + template modular di `src/lib/email/templates/` (locale-aware)
- Google OAuth: isi `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — panduan lengkap di [AUTH.md](./AUTH.md)
- Session idle max 7 hari (sliding). Setelah idle ≥7 hari, user wajib login ulang.
- Pastikan migrasi DB sudah jalan (`user`, `session`, `account`, `verification`, `auth_lockout`).
- Auth API tidak menunggu SMTP selesai (email dikirim di background) agar form terasa responsif.

## 6. Git & file besar

`.gitignore` di root dikonfigurasi agar:

- **Tidak** meng-commit secrets (`.env*`, key/pem), `node_modules`, `.next`, binary Go, upload/media besar, dump DB/Redis
- **Tetap** meng-commit sumber, `package-lock.json`, `go.sum`, logo di `public/images`, migrasi Drizzle, dan `.env.example`

Ini menjaga repo GitHub ringan tanpa mengganggu build/deploy (Vercel/Node + binary Go dari CI/source).

## 7. Checklist development vs production

### Development

- `NODE_ENV=development`, `GIN_MODE=debug`
- `STORAGE_ALLOW_LOCALHOST=true`
- Jalankan `npm run dev` + `npm run dev:api`
- Xendit / SMTP boleh key development

### Production

- Secrets dari secret manager / env host (bukan file di repo)
- `NODE_ENV=production`, `GIN_MODE=release`
- `BETTER_AUTH_URL` & `NEXT_PUBLIC_*` = HTTPS publik
- `HEALTH_CHECK_TOKEN` wajib
- `STORAGE_ALLOW_LOCALHOST=false`
- Postgres/Redis/SeaweedFS di private network + TLS di edge
- Reverse proxy TLS (nginx/Caddy) + HSTS
- Scale: beberapa instance web & API di belakang load balancer; Redis shared untuk rate limit

## 8. Keamanan & ketahanan (baseline)

Detail lengkap: [SECURITY.md](./SECURITY.md).

- Validasi env ketat (Zod + production guards; Go `config.validate`)
- Rate limit Redis di API + auth rate limit
- Security headers (Next + Gin), HSTS di production
- Health token wajib di production (timing-safe)
- Internal secret Next ↔ Go untuk mutating `/api/v1`
- Cookie auth: httpOnly + secure (production)
- CORS allowlist; OPTIONS dari origin asing ditolak
- Structured logging tanpa secret/jawaban assessment
- Graceful shutdown API + connection pooling DB

## 9. Troubleshooting

| Gejala | Periksa |
| --- | --- |
| `dev:api` gagal “Go is not available” | Install Go ≥ 1.25, restart terminal |
| `Missing required env` | Isi `DATABASE_URL` & `REDIS_URL` di root `.env` |
| `SQLSTATE 28P01` / auth failed for `postgres` | Password di `.env` `DATABASE_URL` tidak cocok. Perbaiki `.env`; pastikan `.env.local` tidak menyimpan password usang |
| Auth / DB error | Migrasi Drizzle, kredensial Postgres |
| CORS | `CORS_ORIGINS` / `NEXT_PUBLIC_APP_URL` |
| Upload gagal | nginx basic auth SeaweedFS |
| Favicon lama | Hard refresh / clear cache tab |

## Urutan fitur berikutnya

1. ~~Form login/register Better Auth + verifikasi email + trial~~ → lihat [AUTH.md](./AUTH.md) (trial entitlement domain menyusul)
2. Domain attempts/scoring di Go
3. Dashboard learner + analytics
4. Checkout Xendit + webhook
5. Admin CMS & content lifecycle
