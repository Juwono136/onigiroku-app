# Security & Config Hardening

Panduan keamanan untuk setup config Onigiroku (development → production).

## Prinsip

1. **Template → runtime**: salin `.env.example` → `.env`. `.env.example` **tidak** pernah dimuat saat app jalan
2. **Primary secrets di `.env`**: development memakai root `.env`; `.env.local` opsional dan tidak boleh menimpa credential
3. **Jangan commit secrets**: `.env` / `.env.local` di-gitignore
4. **Validasi ketat**: Zod (Next.js) + Go `config.validate()` menolak misconfig production
5. **Least privilege**: cookie httpOnly, CORS allowlist, internal API secret, health token

## Kontrol yang sudah aktif

| Area | Kontrol |
| --- | --- |
| Env validation | Format URL DB/Redis, panjang secret, pool bounds, production guards |
| Auth cookies | `httpOnly`, `sameSite=lax`, `secure` di production |
| Auth rate limit | `API_AUTH_RATE_LIMIT_MAX` |
| Account lockout | `AUTH_LOCKOUT_*` + tabel `auth_lockout` (hooks Better Auth) |
| Email verification | Wajib sebelum login credential |
| Session idle | Sliding 7 hari (`expiresIn` + `updateAge`) — lihat [AUTH.md](./AUTH.md) |
| CORS | Allowlist `CORS_ORIGINS` saja; OPTIONS dari origin asing ditolak |
| Security headers | nosniff, frame deny, referrer, permissions, COOP/CORP, HSTS (prod) |
| Health endpoints | Production wajib `HEALTH_CHECK_TOKEN` (timing-safe compare) |
| Internal API | Mutating `/api/v1/*` butuh header `X-Internal-Secret` |
| Webhooks | Dikecualikan dari internal secret; verifikasi token provider |
| Rate limit | Redis-backed per IP (`API_RATE_LIMIT_MAX`) |
| Body limits | Gin multipart max 8 MiB |
| Redis | Password di URL; `rediss://` + TLS verify di production bila dipakai |
| Storage | Production wajib `STORAGE_ALLOW_LOCALHOST=false` + basic auth credentials |
| Logging | Production menolak `LOG_LEVEL=debug` |
| Powered-By | Dimatikan di Next.js |

## Checklist production sebelum go-live

```bash
# Generate secrets
openssl rand -base64 32   # BETTER_AUTH_SECRET
openssl rand -base64 32   # INTERNAL_API_SECRET
openssl rand -base64 24   # HEALTH_CHECK_TOKEN
```

Pastikan di env production:

- `NODE_ENV=production`
- `GIN_MODE=release`
- `LOG_LEVEL=info` (atau `warn`)
- `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` / `APP_URL` memakai **HTTPS**
- `REDIS_URL` berisi password (`redis://:<password>@...` atau `rediss://...`)
- `STORAGE_ALLOW_LOCALHOST=false`
- `HEALTH_CHECK_TOKEN` ≥ 16 karakter
- `INTERNAL_API_SECRET` ≥ 16 karakter, bukan placeholder
- Xendit live keys + callback token terisi bila billing aktif

## Menjalankan dengan aman di lokal

```bash
cp .env.example .env
# isi password nyata, jangan biarkan placeholder
npm run preflight
npm run dev        # terminal 1
npm run dev:api    # terminal 2
```

`preflight` memuat root `.env` (primary) dan memberi peringatan jika key wajib hilang/lemah.

## Ancaman yang dimitigasi (baseline)

- Credential stuffing / brute force → rate limit + lockout knobs + strong secrets
- Session theft via XSS → httpOnly cookies + CSP-friendly headers baseline
- Clickjacking → `X-Frame-Options: DENY`
- MIME sniffing → `X-Content-Type-Options: nosniff`
- CORS abuse → explicit origin allowlist
- Health endpoint recon → token wajib di production
- Unauthorized domain API writes → `X-Internal-Secret`
- Webhook spoofing → token provider (Xendit) terpisah
- Secret leakage via git → `.gitignore` + placeholder detection di production boot

## Yang belum (roadmap keamanan)

- Full Content-Security-Policy per-route
- WAF / bot protection di edge
- MFA admin (sesuai PRD)
- Dependency scanning di CI (npm audit / govulncheck)
- Secret manager (AWS SM / Doppler / Vault) menggantikan file `.env` di server
