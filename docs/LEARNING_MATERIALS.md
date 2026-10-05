# Learning Materials + News CMS

Admin TipTap CMS for bilingual (ID/EN) learning content with two visibility modes, tags, auto-slugs, and SeaweedFS media under `cms/`.

## Access model (1A)

| Visibility | Audience | Surface |
| --- | --- | --- |
| `STUDENT` | Authenticated `USER` (+ `ADMIN` preview) | `/dashboard/materials` |
| `PUBLIC` | Anyone | `/news`, landing announcements slider |

Paid entitlement checks are **not** live. Extension point: `assertCanAccessStudentMaterials` in `src/lib/materials/entitlement.ts` (today always allows USER/ADMIN). Go `billing` remains a Xendit stub and is **not** wired to materials.

## Data model

Migration `drizzle/0005_learning_materials.sql`:

- `learning_material` — slug (unique), visibility, status (`DRAFT`\|`PUBLISHED`\|`ARCHIVED`), featured, cover key, author, published_at, soft `deleted_at`
- `learning_material_locale` — `(material_id, locale)` with `id`\|`en`; title, excerpt, TipTap JSON `body`, `body_text` for search
- `learning_tag` + `learning_material_tag` — max **5** tags per material (enforced in Go)

### Slug rules

- **One shared public URL slug** per material (`learning_material.slug`) so `/news/{slug}` and `/en/news/{slug}` stay switchable without remapping paths
- Auto-generated from title while `DRAFT`: **Indonesia title preferred**, then English (server `Create` / `Update`)
- Editor live preview **follows the active content-language tab** (badge ID/EN). If the active title would produce a different slug than the shared URL, a hint shows the canonical shared slug
- Shown as a **live read-only preview** (never an editable input) — avoids unsafe user-controlled path segments
- Once `PUBLISHED`, slug is immutable (stable news/share URLs across locales)
- TipTap formatting toolbar is **sticky below the admin topbar** (`top-14` / `sm:top-16`, z below navbar) while scrolling long body content

### Tags

- Max **5** tags per material
- Admin suggest returns up to 50 matches with `usageCount`
- Unused catalog tags can be deleted via `DELETE /api/admin/materials/tags/:tagId` (409 `TAG_IN_USE` if still linked)
- Tags linked to materials stay until unlinked / material hard-deleted

### Excerpt

- Not edited in the admin UI
- Derived on save from TipTap body plain text (~200 chars) in the Next client
- Go `replaceLocales` also fills an empty excerpt from `body_text` so API clients cannot skip it

### Featured

Only meaningful for `PUBLIC` + `PUBLISHED`. Landing slider loads up to **5** items: featured first, then newest PUBLIC published.

## API surfaces

### Go (unversioned `/api/*`, internal secret)

| Group | Routes | Authz |
| --- | --- | --- |
| Admin | CRUD `/api/admin/materials*`, tag suggest + delete unused | Secret + `RequireAdminActor` |
| Student | `/api/materials`, `/api/materials/:slug` | Secret + `RequireActor` (USER/ADMIN); STUDENT+PUBLISHED only |
| Public | `/api/news`, `/api/news/:slug`, `/api/news/featured` | Secret; PUBLIC+PUBLISHED only |

Media: cover/content images via existing media presign with `folder: cms`, cleanup on hard delete. Max **5MB** per image; MIME jpeg/png/webp/gif; recommended cover ~1600×900 (16:9 preview).

### Next BFF

- `/api/admin/materials/**` — CSRF origin check + fresh ADMIN session
- `/api/admin/materials/cover` — multipart upload to `cms/` (5MB limit)
- `/api/admin/materials/tags` — suggest; `DELETE .../tags/:tagId` for unused catalog cleanup
- `/api/materials/**` — session USER/ADMIN + entitlement stub
- Public news preferably loaded RSC → `goListNews` / `goGetNews` / `goFeaturedNews`

## Admin UI

- Sidebar **Learning materials** → `/admin/materials`
- Breadcrumb: admin paths use a single **Home** crumb (no duplicate Overview)
- List: debounced search by title/keyword (body text indexed server-side), visibility/status/sort filters (`FilterSelect`), hybrid **card grid &lt;lg** / **row list on desktop**, pagination, archive/delete confirms
- Editor layout: main locale tabs + title + TipTap; side panel with true **16:9** cover preview, visibility/status (`FilterSelect`), featured (PUBLIC only), searchable tags with unused-delete
- TipTap: H2/H3, bold/italic/underline, lists, link, image, blockquote, HR, text align, table insert (default 2×2) with distinct add/delete row/column/table icons
- Soft-delete / Archive sets `status=ARCHIVED` (still visible in admin under Status → Archived or All). Hard-delete removes the row and cleans SeaweedFS cover objects. The Archive action is hidden once a material is already archived.
- Create / save / remove-cover / archive / hard-delete / unused-tag-delete all use confirmation dialogs
- List layout toggle: row list vs card grid (persisted in localStorage)
- TipTap link insert uses an in-app dialog (http/https only), not the browser prompt
- Unsaved guard clears cleanly after a successful save
- Search placeholder focuses on material titles (server still matches title + body text)

## Student UI

- `/dashboard/materials` list + `/dashboard/materials/[slug]` reader
- `robots` noindex; no share UI; unauthenticated → login redirect

## Public News

- `/[locale]/news` + `/[locale]/news/[slug]`
- List: debounced title search (`?q=`), scalable **multi-select** tag filters (popular chips + searchable overflow; URL `?tags=a,b` or legacy `?tag=`), pagination (`?page=`), polished cards
- Multi-tag filter uses **OR** matching (material has any selected tag); capped at 12 slugs server-side
- No article-count / “showing X–Y of Z” chrome on the public list — only prev/next when `totalPages > 1`
- Detail: no excerpt under title (body is source of truth), wider column (`max-w-6xl`), full-width proportional body images, share-link button
- Tag labels resolve by site locale (`nameId` / `nameEn`)
- Body images open a **full-viewport lightbox** (button + mouse-wheel zoom, drag-to-pan, reset, Esc / click-outside)
- Landing: `getLandingPageContent` merges CMS featured/latest (max 5) with i18n seed fallback when empty

## Admin tags

- Bilingual `nameId` / `nameEn`; editor chips follow the active content locale tab; click a chip to edit both names
- Unused catalog tags can be deleted (`DELETE /api/admin/materials/tags/:tagId`)

## Media

- Cover / body images: SeaweedFS `cms/`, max 5MB, replace cleans previous object
- Reader lightbox: full-viewport TipTap body image zoom (buttons, mouse wheel, drag-to-pan; not a small corner dialog)
- Body images render full content width (`width: 100%`) for proportional, responsive layouts

## Security notes

- Cookie session + CSRF on admin mutations; Go actor DB verify
- TipTap JSON sanitized on write; XSS-safe render (no raw unsanitized HTML)
- Visibility enforced in Go, not UI-only
- MIME/size validation for `cms/` uploads (5MB); folder allowlist
- Tag delete is idempotent-safe and rejects in-use tags (`TAG_IN_USE`)

## Xendit prep (future)

1. Persist `user_entitlement` (or equivalent) from verified Xendit webhooks
2. Implement checkout from the billing stub
3. Change `assertCanAccessStudentMaterials` to require an active entitlement for paid STUDENT materials (keep ADMIN preview)
4. Optional: Go `RequireEntitled` for student materials routes

See also: [CMS.md](./CMS.md), [STORAGE.md](./STORAGE.md), [INTEGRATION.md](./INTEGRATION.md), [ENVIRONMENT.md](./ENVIRONMENT.md).
