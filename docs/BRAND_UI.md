# Brand & UI Guidelines



Sumber: **PRD & SRS v1.0 §13** (`docs/Onigiroku_PRD_SRS_v1.0.pdf`) + mark Onigiroku.



## Brand interpretation (PRD §13.1)



- Mark: vivid red + charcoal outline around white onigiri.

- **Red is a controlled accent** — not a full-page dominant background.

- Preserve readability and professional credibility.

- Japanese cultural cues are layered lightly (seigaiha, asanoha, washi grain, vertical JP copy) so the product feels unique without becoming kitschy.



## Color tokens (PRD §13.2)



| Token | Hex | Penggunaan |

| --- | --- | --- |

| Brand Primary | `#E60012` | CTA, active, brand moments |

| Brand Vivid | `#FF0000` | Logo fidelity / small highlights only |

| Brand Hover | `#C90010` | Hover button |

| Charcoal | `#434040` | Teks sekunder, nav, borders |

| Ink | `#18181B` | Teks utama |

| Rice White | `#FFFFFF` | Cards / core surfaces |

| Warm Canvas | `#FAF8F6` | **Application / landing background** |

| Soft Gray | `#F3F4F6` | Secondary panels (features, FAQ) |

| Success / Warning / Error / Info | PRD §13.2 | Semantic only |



Landing memakai **Warm Canvas** sebagai base, lalu berganti Soft Gray / Rice White / Charcoal CTA — menghindari halaman “penuh putih”.



### Japanese atmosphere utilities (`globals.css`)



| Class | Efek |

| --- | --- |

| `bg-hero-mesh` | Soft brand/charcoal washes on canvas |

| `bg-seigaiha` | 青海波 wave arcs (brand-tinted, low opacity) |

| `bg-asanoha` | 麻の葉 lattice (charcoal whisper) |

| `bg-washi` | Canvas + grain + faint seigaiha |

| `bg-grain` | Soft paper noise |

| `jp-rail` | Noren-inspired left brand accent |

| `font-jp` | Noto Sans JP |



## Typography (PRD §13.3)



- UI: Plus Jakarta Sans Variable (self-hosted `@fontsource-variable/plus-jakarta-sans`)

- Japanese: Noto Sans JP self-hosted (`@fontsource/noto-sans-jp`, class `font-jp`)
- Dev default memakai Webpack (`npm run dev`) agar tidak kena bug CSS HMR Turbopack; font tidak diunduh dari Google saat compile

- Body learning content ≥ 16px (material reader)



## Responsive layout

- Mobile-first: CTA full-width di layar sempit, grid 1→2→3 kolom
- Hero/Announcements: full-viewport di `md+`; di mobile tinggi mengikuti konten (hindari scroll ganda)
- `overflow-x: clip` di `html/body`; safe-area untuk notch
- Header: menu atas di mobile; nav desktop dari `md`

## UI patterns (PRD §13.4)



- Radius sedang **10–14px** (`rounded-xl` / `rounded-[10px]`), tidak berlebihan

- Whitespace jelas; hierarchy tegas

- Framer Motion: entrance on mount (`useEntranceMotion`) + `whileInView`; hormati `prefers-reduced-motion`

- Progress selalu dipasangkan label/ikon



## Landing sections



Urutan: **Hero → Announcements (max 5 image slides) → Capabilities → How it works → Sample preview → Pricing → FAQ → CTA**.

Hero & Announcements memakai tinggi hampir full viewport (`min-h-[calc(100svh-4rem)]`) agar section terasa penuh saat user berada di situ. Hero punya cue **Scroll to explore** di tepi bawah.



Komponen: `src/components/landing/*`.



## Authenticated workspace (AppShell)

Dashboard peserta (`/dashboard`), admin (`/admin`), dan settings (`/settings`) **tidak** memakai chrome marketing (`SiteHeader` / `SiteFooter`).

Mereka memakai route group `src/app/[locale]/(app)/` + komponen `src/components/app-shell/*`:

| Bagian | Perilaku |
| --- | --- |
| Sidebar | **Sticky** `h-svh`; toggle collapse di **tengah vertikal** tepi sidebar, **muncul saat hover** (tetap ada tombol di topbar); drawer mobile dengan **Close (X)**; active item solid brand |
| Topbar | Breadcrumb dinamis, tombol collapse/expand (desktop), tombol ke situs publik, locale switcher (`auto`: dropdown di mobile / pills di desktop), avatar/`UserMenu` |
| Content width | Workspace content memakai `max-w-[96rem]` agar dashboard/settings lebar dan nyaman di layar besar |
| Footer | Footer ringkas workspace (lebar sama dengan content) |
| Atmosfer | Token `.app-workspace` (surface lebih lembut), `jp-rail`, mesh lembut — nyaman untuk sesi panjang |

Copy chrome: namespace i18n `appShell` + `localeSwitcher` (ID/EN mengikuti switcher bahasa).

**Eye comfort:** workspace memakai background stone-warm (`--workspace-*`) bukan pure white, agar glare berkurang saat user lama di dashboard. Landing tetap memakai canvas branding PRD.



## 404 / Not found

Tampilan sederhana: kode **404** besar, judul singkat, satu paragraf, CTA utama ke beranda (+ link login). Tanpa card berat / hint ekstra.

| File | Peran |
| --- | --- |
| `src/app/[locale]/not-found.tsx` | 404 berbrand di dalam locale layout |
| `src/app/[locale]/[...rest]/page.tsx` | Catch-all → `notFound()` |
| `src/app/not-found.tsx` | Fallback root (html/body mandiri) |
| `src/components/shared/not-found-view.tsx` | UI 404 (i18n `notFound.*`) |



## CMS-ready content (PRD FR-CMS-001)



Semua copy landing dialirkan lewat kontrak CMS:



| Layer | Path |

| --- | --- |

| Types | `src/content/cms/landing-types.ts` |

| Loader | `src/content/cms/get-landing-content.ts` |

| Copy seed (sementara) | `src/messages/{id,en}.json` |

| Announcement visuals | Lucide icon presets by default; optional CMS `imageSrc` (CDN) later |



Saat admin CMS hidup, ganti hanya loader (baca `pages` / `page_versions` / `faqs` / `seo_metadata` / announcement assets) — komponen section tetap menerima props typed.



Field yang akan di-manage admin: hero, **announcement slides (≤5)**, features, steps, preview metrics, pricing plans, FAQ Q&A, CTA, nav labels, SEO meta.



## Logo assets



| File | Penggunaan |

| --- | --- |

| `public/images/onigiroku-logo.png` | Brand mark asli (jangan di-reprocess) |

| `src/app/icon.png` / `favicon.ico` | Favicon |

| `src/app/apple-icon.png` | Apple touch |



Komponen: `BrandLogo`, `BrandWordmark`.



## Navigation (mobile)



Menu turun dari atas (`site-header.tsx`), bukan sheet samping.



## Scroll to top



`ScrollToTopButton` di `src/app/[locale]/layout.tsx`.


