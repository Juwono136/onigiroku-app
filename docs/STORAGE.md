# Storage — SeaweedFS lifecycle

Onigiroku menyimpan file media (gambar, audio, PDF) di **SeaweedFS** lewat nginx gateway (`STORAGE_ENDPOINT`, default `:8333`). Web (Next.js) dan API (Go) memakai kontrak yang sama supaya tidak ada orphan/duplikat.

## Penting: browser tidak pernah login ke SeaweedFS

Jika gateway memakai `STORAGE_AUTH_MODE=nginx-basic`, **browser tidak boleh** memanggil `http://localhost:8333/...` langsung. Itu memunculkan dialog native “Sign in” (username/password storage) — buruk untuk UX dan membocorkan model keamanan.

| Operasi | Siapa yang bicara ke SeaweedFS | URL yang dilihat browser |
| --- | --- | --- |
| Upload / replace / delete | **Server saja** (Next BFF atau Go) dengan `USERNAME_STORAGE` / `PASSWORD_STORAGE` | — |
| Tampilkan gambar/file | Browser → **`/api/media/{objectKey}`** (Next proxy) → SeaweedFS (server-side auth) | `/api/media/avatars/…` |

Legacy URL di DB yang masih `http://localhost:8333/...` di-rewrite otomatis lewat `toBrowserMediaUrl()` saat render.

## Alur profesional (create / replace / delete)

```text
1) CREATE
   App (server) → createPresignedUpload / POST /api/v1/media/presign
   → objectKey unik: {folder}/{uuid}-{safeFilename}
   → server PUT ke STORAGE_ENDPOINT (basic auth server-side)
   → simpan publicUrl browser-safe: /api/media/{objectKey} (atau CDN bila auth=none)

2) REPLACE (update)
   → PUT file baru ke objectKey BARU
   → update DB ke publicUrl baru
   → confirmObjectReplacement(previousObjectKey) best-effort
   → jika updateUser gagal setelah PUT → hapus objectKey baru (anti-orphan)
   ⇒ file lama dihapus → tidak duplikat

3) DELETE
   → deleteObject(objectKey); 404/410 = sukses (idempotent)
   → hapus referensi di DB

4) READ (browser)
   GET /api/media/{objectKey}
   → validasi namespace key
   → proxy GET ke STORAGE_ENDPOINT + Authorization server-side
   → stream ke browser (tanpa expose credential)
```

## Modul

| Layer | Path | Fungsi |
| --- | --- | --- |
| Next.js | `src/lib/storage/index.ts` | Presign metadata, delete, replace confirm |
| Next.js | `src/lib/storage/public-url.ts` | `buildPublicMediaUrl`, `toBrowserMediaUrl`, `extractOwnedObjectKey` |
| Next.js | `src/app/api/media/[...key]/route.ts` | Proxy GET/HEAD media (no basic-auth prompt) |
| Next.js | `src/app/api/settings/profile` | Avatar upload server-mediated |
| Go Gin | `backend/internal/domain/media/` | Presign/delete; `publicUrl` = `{APP_URL}/api/media/{key}` |
| Auth | `X-Internal-Secret` | Mutating Go media API hanya dari trusted server |
| Gateway | nginx + SeaweedFS | Basic auth **hanya** untuk server |

## Keamanan (OWASP-minded)

- Credential storage **tidak** dikirim ke browser / tidak ada di `NEXT_PUBLIC_*`
- MIME allowlist + max 25 MiB (upload)
- Filename disanitasi; tolak `..`, `/`, `\`
- `objectKey` harus di namespace `uploads|media|cms|avatars` (atau bucket)
- Proxy media: nosniff, no directory listing, 404 untuk key di luar namespace
- Production: `STORAGE_ALLOW_LOCALHOST=false`
- Object key memakai UUID → sulit dienumerasi

## Env terkait

Lihat [ENVIRONMENT.md](./ENVIRONMENT.md).

| Key | Catatan |
| --- | --- |
| `STORAGE_ENDPOINT` | Internal gateway (server-only) |
| `STORAGE_AUTH_MODE` | `nginx-basic` (default lokal) atau `none` bila CDN publik |
| `USERNAME_STORAGE` / `PASSWORD_STORAGE` | Hanya server |
| `NEXT_PUBLIC_STORAGE_URL` | Opsional: CDN publik **tanpa** basic auth. Jika sama dengan gateway basic-auth, abaikan untuk browser — pakai proxy |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Dipakai Go untuk membentuk `publicUrl` proxy |

## Catatan implementasi fitur

Saat menambah UI upload (CMS, avatar, soal):

1. Upload **selalu** lewat API server (jangan `fetch` langsung ke `:8333` dari client)
2. Simpan `publicUrl` dari `buildPublicMediaUrl` / response server
3. Render `<img src={toBrowserMediaUrl(url)}>` agar legacy gateway URL ikut aman
4. Update = objectKey baru + hapus key lama setelah sukses
5. Delete record = hapus object storage (idempotent)

Avatar akun: folder `avatars/` lewat `/api/settings/profile` — lihat [SETTINGS.md](./SETTINGS.md).
