# Learning Materials + News CMS

Admin TipTap CMS for bilingual (ID/EN) learning content with two visibility modes, tags, auto-slugs, and SeaweedFS media under `cms/`.

## Access model

News and student lessons share `learning_material` (TipTap + SeaweedFS `cms/`). Pages, admin surfaces, and access rules are separate.

| Visibility | Audience | Surface |
| --- | --- | --- |
| `PUBLIC` | Anyone | `/news`, landing announcements slider. No category, no position. Admin: `/admin/news`. |
| `STUDENT` | Signed-in user, inside one category | `/dashboard/materials` category cards → path → reader. Admin: `/admin/learning`. |

`/admin/materials` redirects to `/admin/news` so old bookmarks keep working. A STUDENT row with no category stays admin-only and does not appear on the student dashboard.

### Path lock

One lesson belongs to one category and has `position` (1, 2, 3…). Other categories are open. Inside a category, lesson N opens only after lessons 1..N−1 are completed for that user. Admin preview bypasses the lock. The check lives in Go (`OpenStudentLesson`); a locked GET returns `403 LESSON_LOCKED`.

Completed means the lesson was opened and, when it has questions, the latest attempt score is at least `pass_score` (default 80, admin range 50–100). Retries are unlimited. Inserting a lesson in the middle does not delete earlier completions; that new lesson locks every later step until it is passed.

### Practice

Questions sit at the bottom of the same lesson page: multiple choice (one correct option), short answer (several accepted answers, compared after Unicode/case/space normalization), and card quiz (student flips, then marks knew / still learning; knew counts as correct). Answer keys are omitted from the read payload and returned only in the submit review. When `shuffle_questions` or `shuffle_choices` is on, the student lesson payload randomizes question order and/or multiple-choice option order (crypto shuffle on the Go API); a failed retry reshuffles again in the browser. Grading always keys off question and option IDs, so shuffle never changes the score. Submit is idempotent on the client `attemptId` (UUID). A retry must use a new id. Every submit writes `learning_quiz_attempt` + `learning_quiz_answer` (pass and fail) so personal tracking and monitoring can use the same store later.

Reading progress is a debounced scroll percent (`POST /api/materials/:slug/progress`). A lesson with no questions completes on that first progress touch.

### Plan access

Each category has `plan_key` (default `free`) and grants live in `user_learning_access`. `assertCategoryAccess` allows every signed-in user while `LEARNING_PAYWALL_ENABLED` is unset or not `true`/`1`. When the flag is on, `free` categories stay open and other plans need an active grant. Any future payment gateway only writes that grant. The existing billing stub is not connected.

## Data model

Migration `drizzle/0005_learning_materials.sql`:

- `learning_material` — slug (unique), visibility, status (`DRAFT`\|`PUBLISHED`\|`ARCHIVED`), featured, cover key, author, published_at, soft `deleted_at`
- `learning_material_locale` — `(material_id, locale)` with `id`\|`en`; title, excerpt, TipTap JSON `body`, `body_text` for search, plus optional `seo_title` / `seo_description` (migration `0007_material_locale_seo.sql`)
- `learning_tag` + `learning_material_tag` — max **5** tags per material (enforced in Go)

Migration `drizzle/0008_learning_paths.sql`:

- `learning_category` — unique slug (among non-deleted rows), bilingual name/description, cover, position, status, `plan_key` default `free`, soft delete
- `learning_material.category_id`, `position`, `pass_score` (50–100, default 80), `shuffle_questions` / `shuffle_choices` (booleans, default false). Check: `PUBLIC` must have null category and position. Unique `(category_id, position)` among non-deleted rows
- `learning_question` + `learning_question_option` — `multiple_choice` | `short_answer` | `flashcard`; correct answers stay server-side
- `learning_lesson_progress` — primary key `(user_id, material_id)`
- `learning_quiz_attempt` (id is the client UUID) + `learning_quiz_answer`
- `user_learning_access` — `user_id`, `plan_key`, status, source, external ref, validity window. No admin UI yet

### Slug rules

- **One shared public URL slug** per material (`learning_material.slug`) so `/news/{slug}` and `/en/news/{slug}` stay switchable without remapping paths
- Auto-generated from title while `DRAFT`: **English title preferred**, then Indonesia (server `Create` / `Update` for news, lessons, and learning categories). Saving a draft refreshes the slug from the English name when English is filled
- Editor live preview **follows the active content-language tab** (badge ID/EN). The canonical shared slug prefers English. If the active title would produce a different slug than that shared URL, a hint shows the canonical shared slug
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
| Student | `/api/materials/:slug`, `POST .../progress`, `POST .../quiz`, `/api/learning/categories`, `/api/learning/categories/:slug` | Secret + `RequireActor`; published lesson must be unlocked |
| Admin learning | CRUD `/api/admin/learning/categories`, archive, hard-delete, `PUT .../lessons/order` | Secret + `RequireAdminActor` |
| Public | `/api/news`, `/api/news/:slug`, `/api/news/featured` | Secret; PUBLIC+PUBLISHED only |

Media: cover/content images via existing media presign with `folder: cms`, cleanup on hard delete. Max **5MB** per image; MIME jpeg/png/webp/gif; recommended cover ~1600×900 (16:9 preview).

### Next BFF

- `/api/admin/materials/**` — CSRF origin check + fresh ADMIN session
- `/api/admin/materials/cover` — multipart upload to `cms/` (5MB limit)
- `/api/admin/materials/tags` — suggest; `DELETE .../tags/:tagId` for unused catalog cleanup
- `/api/admin/learning/categories/**` — category CRUD, archive, hard-delete, lesson order
- `/api/learning/categories/**` — student category list and path
- `/api/materials/:slug/progress` and `/quiz` — session USER/ADMIN, trusted mutation origin
- `/api/materials/**` — session USER/ADMIN; category access is enforced in Go
- Public news preferably loaded RSC → `goListNews` / `goGetNews` / `goFeaturedNews`

## Admin UI

- Sidebar **News** → `/admin/news`. Every news row is `PUBLIC`; the editor does not show a visibility control. Featured, status, SEO, and Preview stay. Sidebar **Learning** → `/admin/learning` (categories, ordered lessons, practice builder, pass score). Lesson editor has no visibility, featured, or SEO fields.
- Breadcrumbs are separate: News uses Home → News → New article / Edit article. Learning uses Home → Learning → New category / Category → New lesson / Edit lesson. The list pages do not append a create crumb. `/admin/news` must not be treated as a “new” route.
- News list: debounced search, status/sort filters, pagination. Learning category list: debounced search, status filter, sort (recently updated, name), page size, pagination. Path order is stored automatically and is not a list filter. Both stay on their own APIs.
- News editor: locale tabs + TipTap; side panel with cover, status, featured, tags. No visibility field. Learning category editor uses Indonesia/English tabs, a rich-text description (1000 visible characters), an optional cover, and status. The page uses the same `max-w-[96rem]` width as the learning list and the lesson editor. From the `xl` breakpoint the lesson list sits beside the form in a side column up to 26rem, and the form uses the remaining width. Below that, the list is a full-width panel under the form and scrolls when a category has many lessons. On a phone, each lesson stays one compact row. **Archive** and **Delete** are icon buttons with tooltips next to Save. Category form dirty state (name, description, cover, status) uses the same leave confirmation + beforeunload pattern as the lesson editor. Question cards put the title above the icon actions on a phone, and sit on one row from the small breakpoint up. The text toolbar scrolls sideways on a phone and wraps onto extra rows from the medium breakpoint up. The student path is read-only information, not a form field. Plan key stays `free` in the database and is not an admin input until a payment package is connected. A cover is optional. When none is stored, admin and student surfaces show the Onigiroku logo (`/images/onigiroku-logo.png`). Required fields are marked with an asterisk. Name is required. Cover, description, and status have defaults.
- Lesson editor keeps a **Lesson reading** body. That body is the article students read before practice. The reading TipTap starts shorter (`min-h` ~200–220px) with a vertical resize handle and a viewport-based max height so Practice stays reachable without endless scroll. Practice questions are separate and sit at the end of the page. New questions are added from one menu (multiple choice, short answer, card quiz). Each question collapses. Question, explanation, and flashcard-back fields use the same TipTap toolbar in a shorter, resizable scrolling area. Admins can toggle **Shuffle questions** and **Shuffle choices** per lesson. Images still upload through the existing `cms/` media route (multi-select supported). Removing a question asks for confirmation. Preview, reorder, and remove are aligned icon buttons with tooltips; the collapse chevron stays vertically centered with the action strip.
- Lesson (and news) editors treat reading body, cover, status, **pass score**, **shuffle flags**, and **practice questions** as dirty state. With unsaved edits, in-app links (including **Back to category**) open a leave confirmation dialog, and a browser refresh/close shows the native beforeunload prompt so drafted questions and content are not lost by accident.
- **Practice preview** uses the same `PracticeSession` component as the student lesson page: choose or type an answer, flip a card, then check. The score, the correct choice, accepted answer keys, and the explanation appear only after that check. Explanation never appears while answering. Grading in the preview stays in the browser because the draft may not be saved yet. The live attempt is still graded only by the Go API.
- **Multiple choice:** admin marks exactly one choice as the answer key. Students do not see the key until submit. After submit, a wrong answer highlights the correct choice and shows its label.
- **Short answer:** admin writes the question, then one or more plain-text answer keys. Matching uses NFKC, lower case, collapsed spaces, and katakana→hiragana folding on both Go and the preview grader, so `カタカナ` and `かたかな` match and letter case does not matter. After submit, the accepted keys and explanation appear.
- **Card quiz:** students flip a responsive front/back card, then mark “I knew it” or “Still learning”. The card back is sent with the public question so the flip works before submit. Explanation still waits until after submit.
- Category list search is a raised field. Cards show the lesson count as its own badge. The list page does not explain lesson reorder arrows. Those controls live on the category editor, next to the lesson list.
- Practice questions use one rich-text prompt and one rich-text explanation (Japanese text is expected). Choices and short-answer keys stay plain text with length limits. Each question has a student preview. Tags are not shown on lesson editors.
- **PUBLIC (news) tools:** **Preview** button opens a clean article-style dialog (title, cover, body — mirrors the public reader). When status is `PUBLISHED`, **Open live page** jumps to `/news/{slug}`. Per-locale **SEO title** (max 70) and **SEO description** (max 160) with placeholders, char counters, and client + Go validation; empty values fall back to article title / excerpt for meta tags (SEO is edited in the form, not shown inside Preview)
- TipTap: H2/H3, bold/italic/underline, lists, link, image (multi-file pick, SeaweedFS `cms/`), blockquote, HR, text align, table insert (default 2×2) with distinct add/delete row/column/table icons. Rendered prose uses shared `.material-prose` styles so student/public views match the toolbar. Empty editors show the placeholder before focus (`showOnlyCurrent: false`, empty document starts with one empty paragraph). Long editors are resizable (`resize-y`) with a sensible max height.
- Soft-delete / Archive sets `status=ARCHIVED` (still visible in admin under Status → Archived or All). Hard-delete removes the row and cleans SeaweedFS cover objects. The Archive action is hidden once a material is already archived.
- Create / save / remove-cover / archive / hard-delete / unused-tag-delete all use confirmation dialogs
- List layout toggle: row list vs card grid (persisted in localStorage)
- TipTap link insert uses an in-app dialog (http/https only), not the browser prompt
- Unsaved guard clears cleanly after a successful save
- Search placeholder focuses on material titles (server still matches title + body text)

## Student UI

- `/dashboard/materials` — category cards (cover, name, `completed/total` bar, debounced search). Empty state does not ask the student to clear a tag filter
- `/dashboard/materials/categories/[slug]` — vertical timeline. Locked lessons are not links; the API also returns 403
- `/dashboard/materials/[slug]` — existing reader plus category progress and practice at the bottom of the same page. Practice uses the same cards as the admin preview: choice buttons, a typed answer, or a flipping card, then a score with explanation. Passing unlocks the next lesson
- `robots` noindex; no share UI; unauthenticated → login redirect
- Progress (`learning_lesson_progress`) and every quiz attempt (`learning_quiz_attempt` + `learning_quiz_answer`) are stored on submit for future personal monitoring and tracking dashboards. That dashboard UI is not built yet; the data path is live and idempotent on `attemptId`

## Public News

- `/[locale]/news` + `/[locale]/news/[slug]`
- List: debounced title search (`?q=`), scalable **multi-select** tag filters (popular chips + searchable overflow; URL `?tags=a,b` or legacy `?tag=`), pagination (`?page=`), polished cards
- Multi-tag filter uses **OR** matching (material has any selected tag); capped at 12 slugs server-side
- No article-count / “showing X–Y of Z” chrome on the public list — only prev/next when `totalPages > 1`
- Detail: no excerpt under title (body is source of truth), wider column (`max-w-6xl`), full-width proportional body images, share-link button
- Detail SEO: `generateMetadata` uses per-locale `seoTitle` / `seoDescription` via `resolveMaterialSeo` (fallback title + excerpt) for title, description, Open Graph, and Twitter cards
- Detail footer: **Latest news** (3 cards excluding current slug) + **Browse all news** / **Back to news list** CTAs → `/news`
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

## Paid access (future gateway)

1. Set `LEARNING_PAYWALL_ENABLED=true` on the Go API
2. Give paid categories a `plan_key` other than `free`
3. Have the payment provider write `user_learning_access` (`plan_key`, status `active`, optional window, `source`, `external_ref`)
4. Leave the billing stub unwired until that writer exists. The grant table is the only contract; it does not name a gateway

See also: [CMS.md](./CMS.md), [STORAGE.md](./STORAGE.md), [INTEGRATION.md](./INTEGRATION.md), [ENVIRONMENT.md](./ENVIRONMENT.md).
