# Readiness baseline — current features

Checklist sebelum menambah fitur baru. Mencakup auth, settings, AppShell, media/SeaweedFS, dan Go BFF.

## Verifikasi otomatis (lokal)

```bash
npm run lint
npm run typecheck
npm run api:test
npm run db:migrate
# Asumsi: npm run dev (:3000) + npm run dev:api (:8080) sudah jalan — jangan restart API bila port bentrok
```

| Cek | Status |
| --- | --- |
| ESLint | Harus lulus |
| `tsc --noEmit` | Harus lulus |
| Go `./...` tests | Harus lulus |
| Migrasi index session/account | `0002_session_account_indexes` |

## Keamanan (OWASP-minded) yang aktif

| Kontrol | Catatan |
| --- | --- |
| Session cookies | httpOnly, sameSite=lax, secure di production |
| Remember me | **Email only** — tidak menyimpan password di localStorage |
| Password policy | Client Zod + server hook (sign-up / reset) |
| Password change | `revokeOtherSessions: true` |
| Account lockout | Upsert atomik (aman concurrent) |
| Role gates | `requireRole` memakai session fresh (`disableCookieCache`) |
| Env production | `instrumentation.ts` memanggil `getServerEnv()` saat boot Node |
| Storage credentials | Tidak pernah ke browser; baca via `/api/media/*` |
| Avatar lifecycle | PUT baru → update DB → hapus lama; orphan cleanup bila updateUser gagal |
| Go rate limit | Production fail-closed jika Redis error |
| Security headers | nosniff, frame deny, referrer, permissions, HSTS (prod) |
| CSRF BFF mutations | Origin/Referer allowlist (admin users + settings) |
| Health includes Go | `GET /api/health` → `checkGoReady()` → Go `/ready` |
| Next↔Go contract | [INTEGRATION.md](./INTEGRATION.md) up to date |

## Performa & skala

| Area | Perilaku |
| --- | --- |
| Login history | Index `(user_id, created_at)` |
| Account lookup | Index `user_id` |
| Media proxy | HEAD tidak mengunduh body; Cache-Control publik untuk key UUID; batas 25 MiB |
| API mutasi | `no-store` pada `/api/auth/*` dan `/api/settings/*` |
| Settings layout | Bento responsif; modal konfirmasi profil |

## Manual smoke (tanpa restart API)

1. Login email/password + Google (anti-duplikat akun).
2. Settings: ganti nama (modal) → navbar update tanpa hard refresh.
3. Upload avatar (modal + preview) → navbar + SeaweedFS; hapus → object hilang; login Google tidak mengembalikan foto.
4. Update password → session lain dicabut; email notifikasi terkirim.
5. Login history menampilkan label jaringan ramah user.
6. Sidebar collapse hover di tengah; content lebar `max-w-[96rem]`.

## Catatan deploy

- Jangan taruh secret di `.env.local` yang menimpa `.env` (Next.js override).
- Production: `STORAGE_ALLOW_LOCALHOST=false`, HTTPS URLs, Redis ber-password, `GIN_MODE=release`.
- Perubahan Go (rate-limit fail-closed, media public base) aktif setelah proses API di-redeploy/restart terjadwal — tidak wajib restart saat develop lokal jika API sudah jalan.

Lihat juga [SECURITY.md](./SECURITY.md), [STORAGE.md](./STORAGE.md), [AUTH.md](./AUTH.md), [SETTINGS.md](./SETTINGS.md).
