# Payments — DOKU Checkout (class packages)

Onigiroku sells **one-time class packages** (not subscriptions) in **IDR** via **DOKU Checkout** (hosted payment page). Transaction history UI is deferred; `commerce_order` + webhook statuses are persisted for later screens.

### Admin class packages (lifecycle)

| Status | Meaning | Public `/classes` |
| --- | --- | --- |
| **Published** (default on create) | Live sellable catalog item (IDR ≥ 1) | Yes |
| **Draft** | Work in progress — never meant for purchase yet | No |
| **Archived** | Retired from catalog; order history + grants kept. Prefer Archive over Delete when orders exist | No |

Draft ≠ Archived: Draft is unfinished; Archive is “was available, now retired”. List filters and empty states explain the difference. The editor uses a card status picker, language-scoped benefits, searchable path entitlement dialog (scales to large catalogs), and DOKU-ready pricing/duration fields.

### Pricing & fractional discounts

| Field | Rules |
| --- | --- |
| `price_idr` | Integer rupiah. Published packages require ≥ 1 |
| `discount_percent` | `numeric(5,2)` — **0–100 with up to 2 decimals** (e.g. `0.25`, `0.5`) |
| Schedule | Required whenever discount &gt; 0 (including &lt; 1%). Outside the window students pay list price |
| Checkout amount | Go computes `effectivePriceIdr` (rounded IDR) → that value is what DOKU charges |

Public `/classes` is a **search-only** catalog (debounced). Cards carry the full pitch; **Buy now** goes straight to `/classes/{slug}/checkout` (no separate detail page — old detail URLs redirect to checkout). Guests are sent through register/login with `callbackUrl` pointing at checkout.

Official references:

- [Retrieve payment credential](https://developers.doku.com/get-started-with-doku-api/retrieve-payment-credential)
- [Checkout backend integration](https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration)
- [Non-SNAP signature](https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-component-from-request-header)

## What each DOKU Dashboard key is for

On **Settings → API Keys** you may see more credentials than Onigiroku uses. Map them as follows:

| Dashboard field | Used by Onigiroku? | Purpose |
| --- | --- | --- |
| **Client ID** (`BRN-…` / `MCH-…`) | **Yes** → `DOKU_CLIENT_ID` | Merchant identity in every Checkout API header (`Client-Id`) and signature component |
| **Active Secret Key** (`SK-…`) | **Yes** → `DOKU_SECRET_KEY` | HMAC secret for request signatures and webhook verification. **Server-only — never expose to the browser** |
| **API Key** (`doku_key_…`) | **No** | Used by other DOKU product lines / older integrations. Not required for Checkout HMAC |
| **DOKU Public Key** (PEM) | **No** (for our Checkout flow) | Asymmetric crypto for some SNAP / advanced flows. Checkout non-SNAP uses **Secret Key HMAC**, not this PEM |
| **Merchant Public Key** | **No** | Optional merchant-side public key for SNAP-style setups. Leave unset for Checkout |
| **Pengaturan SNAP (Token URL, etc.)** | **No** | Bank Indonesia SNAP Open API. Onigiroku uses **DOKU Checkout**, not SNAP |

**Bottom line for Onigiroku:** only set:

```env
DOKU_CLIENT_ID="…"          # Client ID from dashboard
DOKU_SECRET_KEY="…"         # Active Secret Key (Reveal → copy)
DOKU_API_BASE_URL="https://api-sandbox.doku.com"   # or https://api.doku.com in prod
APP_URL="http://localhost:3000"                    # return URLs + public media base
LEARNING_PAYWALL_ENABLED="false"                   # flip true after paid paths + packages exist
```

Use **sandbox** Client ID + Secret Key with `api-sandbox.doku.com`. Use **production** keys only on production hosts with `https://api.doku.com`.

## Env summary

| Variable | Role |
| --- | --- |
| `DOKU_CLIENT_ID` | Checkout + webhook HMAC client id |
| `DOKU_SECRET_KEY` | HMAC secret (server-only) |
| `DOKU_API_BASE_URL` | Sandbox or production API host |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `callback_url` / result / cancel bases under `/classes/{slug}/checkout…` |
| `SALES_NOTIFY_EMAIL` | Reserved for future sales mail |
| `LEARNING_PAYWALL_ENABLED` | When `true`/`1`, Paid-only paths need an active `user_feature_grant` |
| `ALLOW_PAYMENT_SIMULATION` | Optional: when `true` (and not production), enables admin simulate-paid for local testing without a public webhook |

Deprecated: `XENDIT_*`.

## Signature (must match official docs)

Onigiroku signs Checkout create and verifies notifications with the **newline-separated** non-SNAP component string:

```text
Client-Id:{clientId}
Request-Id:{requestId}
Request-Timestamp:{timestamp}
Request-Target:{path}
Digest:{base64(sha256(body))}
```

Then `Signature: HMACSHA256={base64(hmac_sha256(component, secret))}`.

- Create payment: `Request-Target=/checkout/v1/payment`
- Webhook: `Request-Target` = merchant notification path (e.g. `/api/billing/webhooks/doku`)

## Purchase flow

1. Public `/classes` → guest auth with `?buy={slug}` or logged-in `/classes/{slug}/checkout`
2. `POST /api/billing/checkout` (Next BFF: CSRF/origin + session) → Go creates `commerce_order` (`pending`) and DOKU Checkout session
3. Browser redirects to DOKU `payment.url` (all methods activated on the merchant appear; we omit `payment_method_types`)
4. DOKU HTTP notification → signature verify → order `paid` → `user_feature_grant` rows (idempotent)
5. Student returns to `/classes/{slug}/checkout/result` (grants may land a second later)

Price/discount are computed **server-side** from `class_package`; the client amount is never trusted.

## Sandbox testing (local development) — step by step

### A. Dashboard prep

1. Log in to DOKU **Sandbox** dashboard.
2. Copy **Client ID** + **Active Secret Key** into `.env` (see above).
3. Activate payment methods you want to test (QRIS, cards, VA, etc.).
4. Set **Payment Notification URL** to a URL DOKU can reach:
   - With a tunnel (recommended for real webhooks):  
     `https://YOUR_TUNNEL/api/billing/webhooks/doku` (Next)  
     or `https://YOUR_TUNNEL/api/billing/webhooks/doku` pointing at Go if you expose the API port.
   - Without a tunnel: use **admin payment simulation** (section C) after creating a pending order.

### B. App prep

1. Restart Go (`npm run dev:api`) and Next (`npm run dev`) after changing DOKU env.
2. Admin → **Class packages**: create a **Published** package (IDR ≥ 1), set cover, **benefits** bullets, and learning-path entitlements.
3. Admin → Learning path: set **Access mode = Paid-only** for a path covered by that package.
4. Optionally set `LEARNING_PAYWALL_ENABLED=true` on the Go process to enforce grants.

### C. Happy-path checkout test

1. Sign in as a **student** (`USER`).
2. Open `/classes` → package → **Pay with DOKU**.
3. Complete a **sandbox** payment on DOKU’s hosted page (use DOKU’s sandbox test credentials for the method you activated).
4. Confirm:
   - Browser lands on `/classes/{slug}/checkout/result`
   - DB: `commerce_order.status = paid`, `user_feature_grant` rows exist
   - With paywall on, the paid path opens for that student

### D. Webhook tunnel (real notification)

Example with Cloudflare Tunnel / ngrok:

```bash
# expose Next :3000
cloudflared tunnel --url http://localhost:3000
# set DOKU notification URL to https://<tunnel>/api/billing/webhooks/doku
```

The Next route proxies the **raw body + signature headers** to Go for verification.

### E. Local simulation without a public URL

When you cannot receive webhooks (offline, no tunnel):

1. Set `ALLOW_PAYMENT_SIMULATION=true` in `.env` (ignored in production).
2. Create a checkout so a `pending` order exists (or use admin tooling).
3. Call the admin simulate endpoint (session + CSRF) to mark the order paid and write grants — same code path as a successful webhook.

This validates entitlements/paywall without depending on DOKU’s network reaching your laptop. Prefer real sandbox + tunnel before production.

### F. Production checklist

| Check | Detail |
| --- | --- |
| Keys | Production Client ID + Secret Key only on prod hosts |
| API host | `DOKU_API_BASE_URL=https://api.doku.com` |
| HTTPS | `APP_URL` / public site HTTPS |
| Notification URL | Stable public `https://…/api/billing/webhooks/doku` |
| Methods | Activate prod payment methods in DOKU dashboard |
| Paywall | Enable `LEARNING_PAYWALL_ENABLED` only after packages + paid paths are ready |
| Simulation | `ALLOW_PAYMENT_SIMULATION` must be unset/false |

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Checkout “not configured” | Empty `DOKU_CLIENT_ID` / `DOKU_SECRET_KEY`, or Go not restarted |
| DOKU 401 / invalid signature | Wrong secret, or outdated signature layout — Onigiroku uses official newline + `Request-Target` |
| Webhook 401 | Notification URL path must match signed `Request-Target`; body must be raw |
| Paid but path locked | Paywall flag, entitlement `target_id`, grant `ends_at`, package `PUBLISHED` |
| Hard-delete package blocked | Paid orders reference the package — archive instead |

## Security notes

- Secrets server-only; webhook HMAC verify; idempotent grant writes
- CSRF/origin on BFF mutations; actor headers only via `INTERNAL_API_SECRET`
- Rate-limit checkout create; unique `invoice_number` / Request-Id
- Never put `DOKU_SECRET_KEY` in `NEXT_PUBLIC_*`
