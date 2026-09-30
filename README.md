# Onigiroku

Platform SaaS pembelajaran bahasa Jepang: latihan, assessment, quiz, dan monitoring progress real-time.

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 16 (TypeScript), Tailwind CSS 4, shadcn/ui, Framer Motion, next-intl |
| Auth | Better Auth + Drizzle (PostgreSQL) |
| Domain API | Golang Gin (`backend/`) |
| DB | PostgreSQL + Drizzle ORM + pgAdmin |
| Cache / jobs | Redis |
| Email | Nodemailer (Gmail SMTP) |
| Storage | SeaweedFS via nginx gateway |
| Payments | Xendit |
| Validation / state | Zod, Zustand, TanStack Query |

## Quick start

```bash
cp .env.example .env
npm install
```

Isi `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET`, lalu buat DB `onigiroku_db`.

**Terminal 1 — Frontend**

```bash
npm run dev
```

**Terminal 2 — Backend API**

```bash
npm run dev:api
```

Opsional satu terminal: `npm run dev:all`.

- Web: [http://localhost:3000](http://localhost:3000) (ID default, EN: `/en`)
- API: [http://localhost:8080/health](http://localhost:8080/health)

## Dokumentasi

- [Setup & Development](./docs/SETUP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Golang Backend](./docs/GOLANG_BACKEND.md)
- [Environment](./docs/ENVIRONMENT.md)
- [i18n](./docs/I18N.md)
- [Brand & UI](./docs/BRAND_UI.md)
- [PRD/SRS](./docs/Onigiroku_PRD_SRS_v1.0.pdf)

## Brand

- Logo transparan: `public/images/onigiroku-logo.png`
- Favicon: `src/app/icon.png` / `favicon.ico`
- Warna: Brand `#E60012`, Charcoal `#434040`, Ink `#18181B`
