# Onigiroku uses a single root env file for Next.js + Go.
# Copy: cp .env.example .env   (optional: .env.local for local overrides)

.PHONY: run build tidy test

run:
	@echo "Loading env from project root (.env / .env.local)..."
	go run ./cmd/api

build:
	go build -o bin/api ./cmd/api

tidy:
	go mod tidy

test:
	go test ./...
