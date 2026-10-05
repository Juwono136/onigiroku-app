# Settings — profil, password & riwayat login

Halaman `/settings` tersedia untuk **Peserta (`USER`)** dan **Super Admin (`ADMIN`)** lewat AppShell (sidebar + menu avatar navbar).

## Layout

Konten memakai lebar workspace penuh (`max-w-[96rem]`) dengan grid 12 kolom:

| Breakpoint | Susunan |
| --- | --- |
| Mobile | Stack: profil → password → riwayat |
| `lg+` | **Kiri (7 kol):** Edit profil di atas, Update password di bawah · **Kanan (5 kol):** Login history (sticky, daftar vertikal) |

Profil disusun rapat (avatar + form tanpa ruang kosong berlebih). Password new/confirm berdampingan pada `sm+`.

## Fitur

| Bagian | Kemampuan |
| --- | --- |
| Edit profil | Ubah **nama**; upload/hapus **foto profil** (JPG/PNG/WEBP/GIF, maks **5 MB**) ke SeaweedFS; **modal konfirmasi** sebelum simpan nama / ganti foto / hapus foto; badge role memakai komponen yang sama dengan Users Management (PRD: Student=Info, Super Admin=Charcoal) |
| Update password | Current + new + confirm; hide/unhide; validasi policy; toast error; email notifikasi setelah sukses; tinggi kartu menyelaraskan bento |
| Riwayat login | Sesi **7 hari terakhir** sebagai **kartu grid** (waktu relatif + absolut, perangkat, jaringan ramah user, status); paginasi |

## Akses

- Sidebar: **Settings** / **Pengaturan**
- Navbar avatar dropdown: **My settings**
- Admin sidebar item overview: label **Overview** / **Ringkasan** (bukan “Admin console”)

## API (Next BFF → Go domain)

| Method | Path | Backend | Fungsi |
| --- | --- | --- | --- |
| `PATCH` | `/api/settings/profile` | Next / Better Auth | Update nama (CSRF Origin; fresh session) |
| `POST` | `/api/settings/profile` | Next BFF → Go media + Better Auth | Upload avatar (CSRF) |
| `DELETE` | `/api/settings/profile` | Next BFF → Go media + Better Auth | Hapus avatar (CSRF) |
| `POST` | `/api/settings/password` | Next / Better Auth | Ganti password + email notifikasi (CSRF) |
| `GET` | `/api/settings/login-history` | Next BFF → Go `/api/settings/login-history` | Sesi 7 hari (paginated; `callGoApiWithActor`) |

Semua endpoint browser membutuhkan session cookie. Identity (nama/password/`user.image`) tetap Better Auth di Next; query session history & storage orchestration di Go. Kontrak header/env: [INTEGRATION.md](./INTEGRATION.md).

## Avatar & SeaweedFS

1. Validasi MIME + size di Next BFF  
2. `createPresignedUpload` → Go `POST /api/media/presign` (`folder: avatars`, `previousObjectKey`)  
3. Next server `PUT` ke gateway (basic auth **hanya di server**)  
4. Simpan `image` = `/api/media/avatars/…` via Better Auth  
5. `confirmObjectReplacement` → Go `POST /api/media/delete` — tidak meninggalkan file lama  
6. Browser menampilkan avatar lewat proxy `/api/media/*` — tidak ada dialog login SeaweedFS  

URL lama yang masih menunjuk gateway di-rewrite oleh `toBrowserMediaUrl`. Google avatar URL tidak dihapus dari SeaweedFS (hanya key owned Onigiroku).

## Sinkron navbar & Google login

| Perilaku | Implementasi |
| --- | --- |
| Navbar avatar update tanpa hard refresh | API profil meneruskan Set-Cookie session; client memanggil `refreshAuthSession()`; `AppTopbar` memakai `useSession` live |
| Hapus foto lalu login Google | Tidak restore foto Google (`overrideUserInfoOnSignIn: false`) — Settings tetap sumber kebenaran |
| Ganti/hapus foto | Object baru di `avatars/`; object lama dihapus dari SeaweedFS (idempotent) |

## Password

- Policy sama dengan registrasi (min 6, huruf besar/kecil, angka, simbol)  
- Password baru harus berbeda dari password saat ini  
- Setelah sukses, user login berikutnya memakai password baru  
- Akun Google-only tanpa credential: pesan `noCredential`  

## Label jaringan (IP)

IP mentah (mis. IPv6 lokal `0000:…:0000`) diganti label yang dipahami user:

| Kondisi | Label (ID / EN) |
| --- | --- |
| Loopback / all-zero | Komputer ini (lokal) / This computer (local) |
| Private LAN | Jaringan pribadi / rumah / Private / home network |
| Publik | IP terkompresi (tooltip menyimpan detail teknis) |
| Kosong | Jaringan tidak diketahui / Network unknown |

Helper: `src/lib/settings/ip-display.ts` → field `ipLabel` / `ipKind` di API history.

## Modul kode

- UI: `src/components/settings/*` (bento di `settings-workspace.tsx`)
- BFF: `src/app/api/settings/{profile,password,login-history}/route.ts`
- Go client: `src/lib/settings/go-settings.ts` → `callGoApiWithActor`
- Go domain: `backend/internal/domain/settings/*` (device label + `ipKind` dihitung di Go)
- Types history: `src/lib/settings/login-history.ts` + kind helper `ip-display.ts`
- Validasi: `src/lib/validations/settings.ts`
- Storage: `src/lib/storage` (presign/delete via Go)
- i18n: namespace `settings` di `src/messages/{id,en}.json`
