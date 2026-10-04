# Environment Variables

Onigiroku memakai **satu file env di root project** untuk Next.js dan Go API. Tidak ada `backend/.env`.

## Hierarki file (penting)

| File | Peran |
| --- | --- |
| `.env.example` | **Template saja** — daftar key + contoh format. **Tidak pernah** dimuat saat runtime. |
| `.env` | **Sumber kebenaran development** (gitignored). Salin dari example, isi password/secret nyata. |
| `.env.local` | Opsional. Hanya untuk tweak mesin lokal; **jangan** taruh `DATABASE_URL` / Redis / SMTP / auth secrets yang bentrok dengan `.env`. |

```bash
cp .env.example .env
# edit .env — isi secret nyata
```

Loader runtime (`scripts/load-root-env.mjs`, Go `config.Load`, `npm run preflight` / `dev:api`):

1. Muat `.env` sebagai **primary** (override process env)
2. Muat `.env.local` hanya untuk key yang masih kosong

Next.js juga membaca `.env*`; karena itu `.env.local` harus bersih dari credential usang agar web dan API selaras.

## MAIN

| Key | Contoh | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `LOCALE_REGION_OVERRIDE` | *(kosong)* | Opsional: `id` \| `en` untuk memaksa locale kunjungan pertama (dev/test) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Origin app (auth, CORS) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Metadata / SEO |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Base URL Gin API |
| `API_PORT` | `8080` | Port Go API |
| `CORS_ORIGINS` | `http://localhost:3000` | CSV origins yang diizinkan |
| `APP_URL` | `http://localhost:3000` | Canonical app URL (billing/ops) |

## Database

| Key | Keterangan |
| --- | --- |
| `DATABASE_URL` | `postgres://postgres:<password>@localhost:5432/onigiroku_db` |
| `DATABASE_POOL_MAX` / `MIN` / `IDLE_TIMEOUT_SEC` | Tuning pool Next + Go |

`SQLSTATE 28P01` = password di `DATABASE_URL` tidak cocok dengan Postgres. Perbaiki di **`.env`**, bukan di `.env.example`.

## Redis

| Key | Format wajib |
| --- | --- |
| `REDIS_URL` | `redis://:<redis_password>@localhost:6379` |

Password harus ada di URL (setelah `redis://:`). Jika Redis lokal tanpa auth, tetap gunakan format yang sama dengan password kosong hanya bila benar-benar no-auth — untuk Onigiroku disarankan selalu pakai password.

## Better Auth

| Key | Keterangan |
| --- | --- |
| `BETTER_AUTH_SECRET` | Min 32 chars |
| `BETTER_AUTH_URL` | Harus sama URL publik app |
| `AUTH_LOCKOUT_*` | Kebijakan lockout login |
| `SELF_REGISTRATION_ENABLED` / `NEXT_PUBLIC_SELF_REGISTRATION_ENABLED` | Flag registrasi |
| `BETTER_AUTH_SESSION_COOKIE` | Nama cookie session |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Opsional lokal; wajib jika Google sign-in aktif. Panduan: [AUTH.md](./AUTH.md) |
| `AUTH_TRUSTED_ORIGINS` | Opsional, CSV tambahan |

## Email (Nodemailer)

| Key | Keterangan |
| --- | --- |
| `SMTP_*` | Host Gmail SMTP + App Password |
| `EMAIL_LOGO_URL` | URL HTTPS logo di email transactional (Cloudinary) |
| `SALES_NOTIFY_EMAIL` | Penerima notifikasi sales/ops |

Template email memakai `EMAIL_LOGO_URL` lewat `src/lib/email/templates/` (layout modular + template auth Better Auth). Detail: [AUTH.md](./AUTH.md).

## Storage / Logging / Health / Go / Xendit

Lihat `.env.example` untuk daftar lengkap key (template). Ringkas:

- SeaweedFS: `STORAGE_*`, `USERNAME_STORAGE`, `PASSWORD_STORAGE` — lifecycle lengkap di [STORAGE.md](./STORAGE.md)
- `LOG_LEVEL`, `HEALTH_CHECK_TOKEN`
- Go: `GIN_MODE`, `API_*_TIMEOUT`, `API_RATE_LIMIT_MAX`, `INTERNAL_API_SECRET`
- Xendit: `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`, `XENDIT_PUBLIC_KEY`

## Production checklist

Boot production akan **gagal** jika env tidak aman (placeholder secret, HTTP URL publik, Redis tanpa password, `STORAGE_ALLOW_LOCALHOST=true`, `GIN_MODE!=release`, `LOG_LEVEL=debug`, health token lemah).

- Secrets dari secret manager / env host (bukan file di repo)
- `STORAGE_ALLOW_LOCALHOST=false`
- `GIN_MODE=release`, `NODE_ENV=production`, `LOG_LEVEL=info`
- `HEALTH_CHECK_TOKEN` wajib (≥16)
- `INTERNAL_API_SECRET` wajib (≥16, non-placeholder)
- HTTPS pada `NEXT_PUBLIC_*` dan `BETTER_AUTH_URL`
- `EMAIL_LOGO_URL` harus HTTPS publik (bisa diakses klien email)
- `REDIS_URL` tetap memakai password di production

Lihat [SECURITY.md](./SECURITY.md).
