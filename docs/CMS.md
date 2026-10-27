# CMS & Public Content



Onigiroku treats the marketing/landing page as **CMS-managed content** (PRD **FR-CMS-001**, CMS Service §10.4).



## Current state



| Concern | Implementation |

| --- | --- |

| Landing content contract | `src/content/cms/landing-types.ts` |

| Landing loader | `src/content/cms/get-landing-content.ts` (i18n seeds + CMS news merge) |

| News vs learning paths | Shared `learning_material` storage. Public news is `/admin/news` (`PUBLIC`, no category). Student paths are `/admin/learning` (category, order, practice, server-side unlock) — [LEARNING_MATERIALS.md](./LEARNING_MATERIALS.md) |

| Copy source (landing fallback) | `src/messages/id.json` + `en.json` |

| Rendering | `src/app/[locale]/page.tsx` passes typed slices to section components |

| Announcement visuals | Default: Lucide `icon` presets. Optional CMS `imageSrc` from featured/latest PUBLIC news covers |



Section components **do not** hardcode marketing copy — they receive `content` props so the loader (i18n and/or CMS) can change without UI rewrites.



## Announcements (landing slider)



Replaces the former “credibility cards” block on the public home page.



| Rule | Detail |

| --- | --- |

| Max slides | **5** (`LANDING_ANNOUNCEMENT_MAX_SLIDES`) — enforced in the loader |

| Fields per slide | `id`, `icon`, `imageSrc?`, `imageAlt`, `title`, `caption`, `href?`, `enabled` |

| Autoplay | `announcements.autoPlayMs` (0 disables; capped at 60s) |

| UI | `LandingAnnouncements` — icon panel by default; optional CMS image when `imageSrc` is set; swipe, prev/next, dots |

| Image rule | Prefer icons until CMS media exists. Never bake titles into images (fonts break → “tofu”). Copy = i18n/CMS only. Use versioned CDN URLs when swapping assets. |

| Dev vs prod | Same contract: empty `imageSrc` → icon; later absolute HTTPS CDN when admin publishes media |



To hide a slide temporarily, set `slides.<id>.enabled` to `"false"` in messages (or CMS). Empty/disabled slide lists hide the whole section.



## Target CMS entities (PRD §10.5)



`pages`, `page_versions`, `menus`, `faqs`, `seo_metadata`, `redirects`, plus announcement media records (SeaweedFS / CDN).



Admin permissions: `page.manage`, `seo.manage`, `campaign.manage`.



## Editable landing fields (planned admin UI)



- Hero: eyebrow, title, subtitle, CTAs, trust line, orb labels

- **Announcements:** up to 5 slides (icon and/or image) + captions + optional links

- Features / capabilities: title + feature cards (icon enum + text)

- How it works: steps

- Preview: metric labels + demo values

- Pricing: plans, features, badges

- FAQ: question/answer pairs

- CTA banner

- Navigation labels + SEO title/description/OG

- 404 copy (`notFound.*`)



## Public read / admin write



- Public: cached read of published `page_versions` (locale-aware) — works the same in local Next + Go and behind a reverse proxy in production

- Admin: draft → review → publish with audit log (FR-ADM-001)

- Never rewrite historical published versions in place — follow content versioning pattern used for questions/materials

- Go API remains the write path for CMS mutations; Next stays the public read/render surface



## Related docs



- [BRAND_UI.md](./BRAND_UI.md) — visual system from PRD §13

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system layout

- [I18N.md](./I18N.md) — locale & region defaults

- [SETUP.md](./SETUP.md) — local ports (do not double-bind `:3000` / `:8080`)


