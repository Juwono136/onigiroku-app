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
| Edit profil | Ubah **nama**; upload/hapus **foto profil** (JPG/PNG/WEBP/GIF, maks **5 MB**) ke SeaweedFS; **modal konfirmasi** sebelum simpan nama / ganti foto / hapus foto |
| Update password | Current + new + confirm; hide/unhide; validasi policy; toast error; email notifikasi setelah sukses; tinggi kartu menyelaraskan bento |
| Riwayat login | Sesi **7 hari terakhir** sebagai **kartu grid** (waktu relatif + absolut, perangkat, jaringan ramah user, status); paginasi |

## Akses

- Sidebar: **Settings** / **Pengaturan**
- Navbar avatar dropdown: **My settings**
- Admin sidebar item overview: label **Overview** / **Ringkasan** (bukan “Admin console”)

## API (Next BFF)

| Method | Path | Fungsi |
| --- | --- | --- |
| `PATCH` | `/api/settings/profile` | Update nama via Better Auth `updateUser` |
| `POST` | `/api/settings/profile` | Upload avatar → SeaweedFS → update `user.image` → hapus object lama |
| `DELETE` | `/api/settings/profile` | Hapus avatar DB + object SeaweedFS (jika owned) |
| `POST` | `/api/settings/password` | `changePassword` + email `buildPasswordChangedEmail` |
| `GET` | `/api/settings/login-history?page=&pageSize=` | Query sesi 7 hari dari Postgres (paginated) |

Semua endpoint membutuhkan session cookie; error dikembalikan sebagai JSON `{ success, error }` dan ditampilkan lewat toast di UI.

## Avatar & SeaweedFS

1. Validasi MIME + size di server  
2. `createPresignedUpload({ folder: "avatars", previousObjectKey })`  
3. Server `PUT` ke gateway (basic auth **hanya di server**)  
4. Simpan `image` = `/api/media/avatars/…` (bukan `localhost:8333`)  
5. `confirmObjectReplacement(previousKey)` — tidak meninggalkan file lama  
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
- Validasi: `src/lib/validations/settings.ts`  
- History: `src/lib/settings/login-history.ts` + `device.ts` + `ip-display.ts`  
- i18n: namespace `settings` di `src/messages/{id,en}.json`
