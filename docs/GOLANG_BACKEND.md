# Golang Backend Guide (untuk pemula)

Dokumen ini menjelaskan backend Go Onigiroku agar Anda bisa memahami, menjalankan, dan mengembangkan API meskipun baru mengenal Go.

## Kenapa ada Go di samping Next.js?

- **Better Auth + Drizzle** paling natural di Node/TypeScript → tetap di Next.js.
- **Assessment, scoring, analytics, webhook billing** membutuhkan API yang ringan, cepat, dan mudah di-scale → Gin (Go).
- Keduanya memakai **PostgreSQL & Redis yang sama**.

## Konsep Go singkat

| Istilah | Arti praktis |
| --- | --- |
| `package main` | Entry point program yang bisa dijalankan |
| `go.mod` | Seperti `package.json` — nama module & dependencies |
| `internal/` | Kode privat project (tidak di-import package luar) |
| `cmd/api` | Binary “API server” |
| `go run ./cmd/api` | Compile + jalankan tanpa build file dulu |
| `go build` | Membuat binary |
| `go mod tidy` | Sinkronkan dependency seperti npm install |

## Struktur `backend/`

```text
backend/
  cmd/api/main.go          # start server, graceful shutdown
  internal/
    config/                # baca & validasi env
    server/                # wiring Gin + routes
    middleware/            # CORS, logger, recovery, rate limit, ...
    database/              # pgx pool
    redis/                 # Redis client
    health/                # /health /ready
    response/              # JSON envelope
    domain/                # stub per domain bisnis
  pkg/
    logger/                # zap logger
    errors/                # AppError typed
  Makefile
```

## Menjalankan pertama kali

1. Install Go (≥ 1.25). Cek: `go version`
2. Siapkan Postgres & Redis
3. Copy env di **root project** (satu file untuk web + Go):

```bash
cp .env.example .env
```

`.env.example` hanya template. Runtime memakai **root `.env`**.

4. Isi minimal di root `.env`:

```env
API_PORT=8080
NODE_ENV=development
DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/onigiroku_db
REDIS_URL=redis://:<redis_password>@localhost:6379
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8080
CORS_ORIGINS=http://localhost:3000
INTERNAL_API_SECRET=dev_internal_secret_change_me
EMAIL_LOGO_URL=https://res.cloudinary.com/dz8dtz5ki/image/upload/v1790609932/logo_ozcqba.png
```

5. Jalankan API lewat npm (disarankan):

```bash
npm run dev:api
```

Alternatif dari folder `backend/`:

```bash
make run
# atau: go run ./cmd/api
```

`npm run dev:api` memakai `scripts/dev-api.mjs` + `scripts/load-root-env.mjs`: memuat root **`.env` (primary)**, lalu `.env.local` hanya untuk key kosong; mengecek Go; memvalidasi `DATABASE_URL` + `REDIS_URL`; menjalankan Gin dengan graceful shutdown.

6. Uji:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/catalog
```

Frontend di terminal terpisah: `npm run dev`.

## Alur request (cara membaca kode)

1. `main.go` load config → connect DB/Redis → buat Gin engine → listen
2. `server.NewEngine` pasang middleware + register route
3. Handler domain (mis. `content.Handler`) tulis response via `response.OK` / `response.Fail`
4. Error tak terduga ditangkap `recovery` middleware

## Menambah endpoint baru

Contoh: `GET /api/v1/materials/:id`

1. Tambah method di `internal/domain/content/handler.go`
2. Register di `internal/server/server.go`
3. Kembalikan envelope sukses/gagal
4. (Nanti) tulis query pgx + validasi input

Pola handler:

```go
func (h *Handler) GetMaterial(c *gin.Context) {
  id := c.Param("id")
  // TODO: query DB
  response.OK(c, gin.H{"id": id}, nil)
}
```

## Perintah Makefile

| Command | Fungsi |
| --- | --- |
| `make run` | Jalankan API |
| `make build` | Binary ke `bin/api` |
| `make tidy` | `go mod tidy` |
| `make test` | Unit test |

## Integrasi dari Next.js

Gunakan `src/lib/api/go-client.ts`:

```ts
import { callGoApi } from "@/lib/api/go-client";

const result = await callGoApi("/api/v1/catalog");
```

Header `X-Internal-Secret` dikirim otomatis jika `INTERNAL_API_SECRET` terset di kedua sisi.

## Development tips

- Restart Go setelah ubah kode (`go run` tidak hot-reload; pertimbangkan [Air](https://github.com/air-verse/air) nanti)
- Jangan commit `.env`
- Di production, Go API hanya expose di private network / reverse proxy
- Stub domain saat ini **belum** menulis ke DB — aman untuk smoke test routing

## Troubleshooting Go

| Error | Solusi |
| --- | --- |
| `config: DATABASE_URL required` | Isi root `.env` |
| `SQLSTATE 28P01` | Password Postgres di root `.env` salah / tertimpa oleh `.env.local` usang |
| `postgres connect failed` | Cek service Postgres & password |
| `redis connect failed` | Cek Redis di WSL/port forwarding |
| CORS blocked | Samakan origin frontend di `CORS_ORIGINS` |
| Module not found | `npm run api:tidy` atau `go mod tidy` di `backend/` |
| `Go is not available` (npm) | Install Go ≥ 1.25 dan pastikan ada di PATH |

## Roadmap implementasi domain

1. Catalog & materials read API
2. Attempt state machine + autosave
3. Learning events collector (idempotent)
4. Analytics projections / dashboard
5. Xendit checkout + webhook verification
6. Media presign + finalize + scan status
