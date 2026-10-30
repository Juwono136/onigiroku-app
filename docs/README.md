# Documentation index — Onigiroku

| Document | Isi |
| --- | --- |
| [SETUP.md](./SETUP.md) | Setup lokal, npm scripts (`dev` / `dev:api`), production checklist |
| [AUTH.md](./AUTH.md) | Login, register, verifikasi, reset password, Google OAuth, account linking (anti-duplikat), roles, session 7 hari, akun inactive/deleted |
| [ADMIN_USERS.md](./ADMIN_USERS.md) | Users Management admin: list/search/filter/sort/pagination, role/status, soft delete 30 hari, trash, hard delete |
| [SETTINGS.md](./SETTINGS.md) | Edit profil, avatar SeaweedFS, ganti password, riwayat login 7 hari |
| [SECURITY.md](./SECURITY.md) | Hardening config, secrets, CORS, health token, internal API |
| [READINESS.md](./READINESS.md) | Baseline verifikasi sebelum fitur baru (lint / security / perf / smoke) |
| [STORAGE.md](./STORAGE.md) | SeaweedFS upload / replace / delete (tanpa orphan/duplikat) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arsitektur sistem & batas domain |
| [INTEGRATION.md](./INTEGRATION.md) | Kontrak sinkron Next.js BFF ↔ Go (fitur, header, env, media) |
| [GOLANG_BACKEND.md](./GOLANG_BACKEND.md) | Panduan Gin API untuk pemula Go |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Referensi environment variables (root only) |
| [I18N.md](./I18N.md) | Skema bahasa Indonesia & Inggris |
| [BRAND_UI.md](./BRAND_UI.md) | Brand colors (PRD §13), Japanese UI cues, logo, motion, 404 |
| [CMS.md](./CMS.md) | Kontrak konten landing + announcement slider (≤5) CMS-ready |
| [LEARNING_MATERIALS.md](./LEARNING_MATERIALS.md) | Learning materials + News CMS (admin TipTap, student, public `/news` + `/learning-path`, popularity counters, Xendit prep) |
| [Onigiroku_PRD_SRS_v1.0.pdf](./Onigiroku_PRD_SRS_v1.0.pdf) | Product Requirements & SRS |

**Implementasi note:** Payment gateway di kode & setup memakai **Xendit** (instruksi terkini), sementara PRD v1.0 masih menyebut Midtrans sebagai baseline dokumen.
