# GSC-CHANGELOG — MUBX SEO overhaul (2026-10-30)

Domain property in Google Search Console: **mubx.dev** (covers all subdomains).
After deploying, resubmit the sitemaps below and use URL Inspection on the changed URLs.

## Sitemaps to (re)submit in GSC

| Sitemap URL | Status |
|---|---|
| `https://mubx.dev/sitemap.xml` | rewritten — resubmit |
| `https://ai.mubx.dev/sitemap.xml` | updated — resubmit |
| `https://me.mubx.dev/sitemap.xml` | updated — resubmit |
| `https://bot.mubx.dev/sitemap.xml` | updated — resubmit |

Also request indexing for `/for-ai` and the homepage on each subdomain.

---

## ai.mubx.dev (MUBXAI academic tracker) — commit `14277ca`

### New URLs
- `/gpa-calculator` — interactive GPA calculator (HTU grading scale)
- `/courses` — course catalog
- `/majors` — majors hub
- `/majors/data-science`
- `/majors/computer-science`
- `/majors/cybersecurity`
- `/majors/game-design`
- `/majors/electrical-engineering`
- `/majors/energy-engineering`
- `/majors/industrial-engineering`
- `/majors/mechanical-engineering`
- `/faq` — FAQ (also emitted as FAQPage JSON-LD on `/`)
- `/about`
- `/how-it-works`
- `/for-ai` — agent view (safe public AI layer)
- `/api/public/mubxai` — machine-readable entity JSON (allowlisted in robots)

### Changed URLs (metadata/canonical/schema only — same paths)
- `/` — canonical `/`, FAQPage JSON-LD added, server-rendered h1 + section h2s (homepage now SSRs from "landing")
- `/resources` — canonical fixed
- `/llms.txt`, `/llms-full.txt`, `/ai.txt` — rewritten for the MUBXAI / HTU entity
- `robots.txt` — AI crawlers explicitly allowed, `Allow: /api/public/`, host rule
- Site-wide: "MUBX University" strings corrected to Al Hussein Technical University (HTU)

### Now noindex (were indexable — expect these to drop from the index)
- `/planner`, `/planner/semesters`, `/planner/study-log`, `/planner/gamification`, `/planner/settings`
- `/login`
- `/admin` (all admin routes)

---

## mubx.dev (MUBX studio)

### New URLs
- `/services` — services hub
- `/services/link-page`
- `/services/landing-page`
- `/services/business-website`
- `/services/web-system`
- `/services/ecommerce`
- `/services/seo-performance`
- `/work` — case-study index
- `/work/trujo`, `/work/mubxai`, `/work/men-only-show`, `/work/mubxbot`, `/work/aqabwi`,
  `/work/the-glorious-page`, `/work/blob-jo`, `/work/htu-martial-arts`, `/work/vynex-media`,
  `/work/qadumyweb`, `/work/jordan-fa`, `/work/porsche-noir`
- `/for-ai` — agent view
- `/llms.txt`, `/llms-full.txt` — new
- `/ai.txt` — rewritten (Calendly typo fixed, claims corrected)

### Changed URLs (metadata/canonical/schema only)
- `/` — canonical `/`, FAQPage JSON-LD added
- `sitemap.xml`, `robots.txt` — rewritten
- layout — Organization/Website JSON-LD via `src/lib/seo.ts`

### Removed from sitemap / disallowed
- `/links` — permanent redirect to `https://me.mubx.dev/links`; excluded from sitemap and robots-disallowed (avoid duplicate content)

---

## me.mubx.dev (Omar Mubaidin portfolio)

### New URLs
- `/for-ai` — agent view (entity facts, services, citation rules, FAQ JSON-LD)
- `/llms.txt` — new
- `/llms-full.txt` — new

### Changed URLs (metadata/canonical/schema only)
- `/` — Person JSON-LD `alumniOf` fixed to **Al Hussein Technical University (HTU)** (was "Hussein Technical University")
- `/links` — unchanged path, canonical `/links`
- `ai.txt` — replaced (was a duplicate of the studio's file; now me.mubx.dev-specific)
- `sitemap.xml` — now `/`, `/links`, `/for-ai`
- `robots.txt` — unchanged rules, AI crawlers already allowed

---

## bot.mubx.dev (MUBXBot)

### New URLs
- `/for-ai` — agent view (entity facts, capabilities, FAQ JSON-LD)
- `/llms.txt` — new
- `/llms-full.txt` — new
- `/ai.txt` — new

### Changed URLs (metadata/canonical/schema only)
- `/` — title/description now "MUBXBot | HTU Faculty & Office Hours Assistant", **official-HTU claims removed**, "Hashemite University of Technology" keyword fixed to Al Hussein Technical University, Organization JSON-LD now MUBX (not the university), and the page now **server-renders an h1 + description + JSON-LD** (previously only a spinner)
- `/faq` — OG/Twitter titles updated ("HTU Faculty Assistant")
- `/contribute` — now has title/description/canonical (added to sitemap)
- `robots.txt` — AI crawlers explicitly allowed
- `sitemap.xml` — rewritten (see below)

### Removed from sitemap / noindex
- `/test-chat` — removed from sitemap, robots-disallowed, and noindexed (internal test route)

---

## Entity model applied everywhere (for brand queries)

- **MUBXAI** = product (`ai.mubx.dev`), `alternateName`: "MUBX AI", "HTUAI", "MUBX Academic Tracker"
- **MUBX** = studio brand (`mubx.dev`)
- **HTU** = Al Hussein Technical University — the university served (never "Hashemite University of Technology", never "MUBX University")
- **MUBXBot** (`bot.mubx.dev`) = independent, unofficial student project — explicitly *not* official HTU

## Notes / follow-ups

- GSC is a Domain property for `mubx.dev`, so all four sitemaps are submitted under the same property.
- GitHub remote for mubxai is still `https://github.com/Omarmubx7/htuai.git` — consider renaming the repo to `mubxai` (remote rename only; local package names already updated).
- After each deploy, use GSC **URL Inspection → Request indexing** on the four `/for-ai` URLs and the four homepages.
