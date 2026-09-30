# Authentication — Onigiroku

Panduan lengkap autentikasi (login, registrasi, verifikasi email, forgot/reset password, Google OAuth, session, peran).

## Ringkasan arsitektur

| Lapisan | Tanggung jawab |
| --- | --- |
| **Next.js + Better Auth** | Identity, session cookie, email verification, password reset, Google OAuth (`/api/auth/*`) |
| **PostgreSQL (Drizzle)** | Tabel `user`, `session`, `account`, `verification`, `auth_lockout` |
| **SMTP (Nodemailer)** | Email transactional (verifikasi, reset, notifikasi password berubah) |
| **Go API** | Domain API tepercaya via `X-Internal-Secret` — **bukan** validator session user browser |

Session user **tidak** dikirim ke Go. Next.js adalah BFF; Go dipanggil server-to-server.

## Peran (roles)

| Nilai DB (`user_role`) | Nama produk | Dashboard |
| --- | --- | --- |
| `USER` | Peserta / Student | `/dashboard` |
| `ADMIN` | Super Admin (platform owner) | `/admin` |

Enum di `src/lib/db/schema.ts` sengaja **ekstensibel** — role baru bisa ditambahkan migrasi tanpa merombak alur auth.

- Registrasi publik selalu membuat `USER` (`role` **tidak** bisa di-set dari client: `input: false`).
- `ADMIN` di-assign secara operasional (seed / SQL / admin tool), bukan self-serve.
- PRD “Super admin” = permission tier pada role `ADMIN` (granular permissions menyusul).

Helper: `src/lib/auth/roles.ts`.

## Alur fitur

### 1. Sign up (email/password)

1. User mengisi **nama**, **email**, **password**, **konfirmasi password** di `/register`.
2. Validasi Zod (`src/lib/validations/auth.ts`): email valid; password ≥6 dengan huruf besar + kecil + angka + simbol; password cocok.
3. Better Auth membuat user (`emailVerified=false`) + mengirim email verifikasi.
4. UI mengarah ke `/verify-email` — akun belum aktif untuk login sampai link diklik.
5. Setelah verifikasi: `autoSignInAfterVerification` → redirect ke dashboard sesuai role.

Flag: `SELF_REGISTRATION_ENABLED` / `NEXT_PUBLIC_SELF_REGISTRATION_ENABLED`.

### 2. Login

1. `/login` — email + password (ikon show/hide).
2. Email belum terverifikasi → error + arahkan ke `/verify-email`.
3. Sukses → `/dashboard` (USER) atau `/admin` (ADMIN).
4. Link **Forgot password** → `/forgot-password`; **Sign up** → `/register`.

### 3. Forgot / reset password

1. User memasukkan email terdaftar.
2. Email tidak valid (format) → toast error.
3. Email valid → email reset (anti-enumeration: UI tetap sukses generik jika user tidak ada).
4. Link membawa ke `/reset-password?token=…`.
5. User mengisi password baru + konfirmasi → password diperbarui + email notifikasi “password changed”.

### 4. Google OAuth

Jika `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` terisi:

- Tombol Google muncul di login & register.
- Profile Google (nama, email, foto) dipetakan otomatis.
- Password credential tidak dibuat (akun sosial).
- Callback: `{BETTER_AUTH_URL}/api/auth/callback/google`

Jika kosong (lokal default), tombol Google disembunyikan — email/password tetap jalan.

### 5. Session & idle expiry (7 hari)

```ts
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 hari
  updateAge: 60 * 60,          // refresh sliding max tiap 1 jam saat aktif
}
```

Jika user **tidak mengakses** aplikasi selama ≥ 7 hari, session kedaluwarsa dan wajib login ulang.

Cookie: `httpOnly`, `sameSite=lax`, `secure` di production.

### 6. Lockout & rate limit

- Rate limit Better Auth: `API_AUTH_RATE_LIMIT_MAX` / window 60s.
- Lockout credential: tabel `auth_lockout` + `AUTH_LOCKOUT_*` (hooks before/after sign-in).

## File penting

| Path | Fungsi |
| --- | --- |
| `src/lib/auth/index.ts` | Server Better Auth |
| `src/lib/auth/client.ts` | Client React |
| `src/lib/auth/session.ts` | `getServerSession` / `requireRole` |
| `src/lib/auth/lockout.ts` | Account lockout |
| `src/lib/email/templates/*` | Layout modular + template auth |
| `src/components/auth/*` | UI forms |
| `src/app/api/auth/[...all]/route.ts` | Catch-all Better Auth |
| `src/app/[locale]/{login,register,forgot-password,reset-password,verify-email}` | Halaman auth |
| `src/app/[locale]/{dashboard,admin}` | Dashboard per role |

## Template email (modular)

Layout bersama: `src/lib/email/templates/layout.ts` (`renderBrandedEmail`).

Template auth: `src/lib/email/templates/auth.ts`

- Verifikasi email
- Reset password
- Password changed

Template non-auth (billing, CMS, dll.) cukup memakai `renderBrandedEmail` + `sendBrandedEmail` tanpa menyentuh auth.

Logo: `EMAIL_LOGO_URL` (HTTPS CDN). Fallback lokal: `/images/onigiroku-logo.png`.

## Setup Google OAuth (gratis — Google Cloud Console)

Ikuti langkah ini untuk mengisi:

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### A. Buat / pilih project

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Pilih project yang ada, atau **Create Project** (gratis untuk OAuth standar).
3. Pastikan billing tidak wajib untuk OAuth consent + credentials tipe Web (kuota gratis cukup untuk development & traffic awal).

### B. Konfigurasi OAuth consent screen

1. **APIs & Services → OAuth consent screen**.
2. User type: **External** (kecuali Workspace internal).
3. Isi **App name** (`Onigiroku`), user support email, developer contact.
4. Scopes default (`openid`, `email`, `profile`) sudah cukup — jangan minta scope sensitif kecuali diperlukan.
5. **Test users** (saat status *Testing*): tambahkan email Google yang boleh login selama development.
6. Publish app hanya saat production siap (verifikasi Google jika perlu untuk user luar test list).

### C. Buat OAuth Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Name: `Onigiroku Web`.
4. **Authorized JavaScript origins**
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.com`
5. **Authorized redirect URIs** (penting — harus exact):
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Create → salin **Client ID** dan **Client Secret** ke `.env`:

```env
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxx"
BETTER_AUTH_URL="http://localhost:3000"   # samakan dengan origin publik
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

7. Restart **hanya** proses Next.js jika env baru saja diubah (jangan restart Go `:8080` bila sudah jalan kecuali perlu). Hard refresh browser.

### D. Checklist production Google

- Origins & redirect memakai **HTTPS** domain publik.
- `BETTER_AUTH_URL` = URL publik yang sama.
- Consent screen dipublish / verified sesuai kebutuhan user.
- Jangan commit secret ke git.

## Environment terkait

Lihat juga [ENVIRONMENT.md](./ENVIRONMENT.md).

| Key | Wajib | Keterangan |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Ya | ≥ 32 chars |
| `BETTER_AUTH_URL` | Ya | Base URL auth (= app URL) |
| `DATABASE_URL` | Ya | Postgres |
| `SMTP_*` | Ya | Kirim email |
| `EMAIL_LOGO_URL` | Disarankan | Logo di email |
| `GOOGLE_CLIENT_*` | Opsional lokal | Wajib jika Google sign-in diaktifkan |
| `SELF_REGISTRATION_ENABLED` | Opsional | Default `true` |
| `AUTH_LOCKOUT_*` | Opsional | Kebijakan lockout |
| `AUTH_TRUSTED_ORIGINS` | Opsional | CSV origin tambahan |

## Pengujian lokal (tanpa restart port konflik)

Asumsi `npm run dev` (:3000) dan `npm run dev:api` (:8080) sudah berjalan:

1. Buka `/register` → buat akun → cek inbox SMTP → klik verifikasi.
2. `/login` → masuk → harus ke `/dashboard`.
3. `/forgot-password` → email reset → `/reset-password?token=…`.
4. (Opsional) isi Google credentials → tombol Google muncul → uji callback.
5. Untuk uji ADMIN: update `user.role = 'ADMIN'` di DB, login ulang → `/admin`.

Jangan menjalankan ulang API jika port 8080 sudah aktif.

## Password policy (email/password)

Berlaku untuk **register** dan **reset password** (bukan Google OAuth):

| Aturan | Detail |
| --- | --- |
| Panjang | Minimal **6** karakter (maks 128) |
| Huruf besar | ≥ 1 (`A–Z`) |
| Huruf kecil | ≥ 1 (`a–z`) |
| Angka | ≥ 1 (`0–9`) |
| Simbol | ≥ 1 (bukan alfanumerik, mis. `!@#$`) |

Validasi client: Zod di `src/lib/validations/auth.ts`. Server: Better Auth `minPasswordLength: 6` + schema yang sama pada form.

## Toast UX

Semua toast Sonner memakai `position="top-center"` (global di `AppProviders`) agar notifikasi auth dan fitur lain mudah terlihat.

## Keamanan (baseline aktif)

- Password hashing via Better Auth
- Email verification wajib sebelum login credential
- Rate limit + lockout
- Session sliding 7 hari
- Cookies httpOnly / secure (prod)
- Role tidak bisa di-escalate dari form registrasi
- Anti-enumeration pada forgot-password UI

Roadmap: MFA admin (PRD), CSP ketat, granular permission matrix.

Lihat [SECURITY.md](./SECURITY.md).
