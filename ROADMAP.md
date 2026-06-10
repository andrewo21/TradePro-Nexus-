# TradePro Nexus — Product Roadmap

## ✅ PHASE 1 — COMPLETE
Supabase Auth, Trading Card builder, /pro/[slug], /company/[slug], DB schema, domain live.

## ✅ PHASE 2 — COMPLETE
Search (sub→GC free, GC→sub paywalled), full trade filters, all sectors, /feed from DB, Available Now filter, availability quick-update.

## ✅ PHASE 3 — COMPLETE
GC subscriptions (Solo $49, Growing $149, Full $299), 30-day free trial, seat limits, founder rate lock, $99 sub verification, $79 refund, Stripe webhooks.

## ✅ PHASE 5 — COMPLETE
Photo upload (PWA camera), post edit/delete, share (Web Share API), bookmark, follow, feed search, DM (paid GC only), draft save, pin post, /messages.

## ✅ PHASE 6 — COMPLETE
PWA manifest, service worker, push notification infrastructure (VAPID), subscription endpoints, nightly license status cron (pg_cron).

## ✅ PHASE 7 — COMPLETE
In-feed ad cards (every 5 posts), desktop ad rails, /advertise page, advertiser guidelines, ad inquiry API.

## ✅ PHASE 8 — COMPLETE
/api/resume-import endpoint — accepts resume data from TradePro Resume Builder, creates/updates Nexus Trading Card.

## ✅ PHASE 9 — COMPLETE
All policy pages (/policy/*), platform trust statement on homepage, no-grade pledge, full footer policy nav.

## ✅ PHASE 10 — COMPLETE
Inspector, Architect, Engineer profile types. Type-specific build form, Trading Card display, search filter, verification doc requirements.

---

## 🔄 REGISTRY IMPORT SYSTEM — 6-SESSION ROADMAP

### ✅ SESSION 1 — COMPLETE (Foundation)
- Supabase schema: registry_imports, registry_staging, unclaimed_profiles, outreach_log, admin_settings
- Three-layer duplicate detection: exact license (auto-reject), fuzzy name+location (flag), phone match (flag)
- Quality scoring function (1-10): only records ≥ 6 promote to live directory
- Inactive license filtering: active licenses only; nightly pg_cron refreshes license status
- Florida scraper (https://www.myfloridalicense.com/wl11.asp): robots.txt check, 1 req/2 sec rate limit, ViewState handling for ASP.NET, all contractor profession types, CSV fallback if blocked
- Promote pipeline: duplicate check → quality score → clean insert to unclaimed_profiles
- /admin/registry dashboard: import controls, staging stats, unclaimed counts, re-run and CSV upload
- Outreach master switch: hardcoded OFF by default, confirmation dialog required to enable, test mode routes all emails to admin address only

### ✅ SESSION 2 — COMPLETE (Southeast + South Central)

**Florida (Session 1): ✅ complete — 5,924 records promoted to live directory.**

- **Georgia** (https://sos.ga.gov/index.php/licensing): ✅ done for this session — **blocked**.
  Entire `sos.ga.gov` domain returns 403 Forbidden to automated requests, including
  `robots.txt` itself (WAF/bot protection). `lib/scraper/georgia.ts` built and registered
  in `STATE_SCRAPERS` — it probes the licensing page, detects the block, and returns
  `robotsBlocked: true`. A `registry_imports` row was logged
  (`source_state='GA', status='blocked', robots_blocked=true, records_fetched=0`).
  **0 records staged.** CSV upload fallback required — source GA contractor license
  data via an open-records request to the GA Secretary of State / State Licensing
  Board for Residential and General Contractors, then use `/api/admin/registry/upload/GA`.

- **Texas** (https://www.tdlr.texas.gov): ✅ done for this session.
  TDLR publishes daily bulk CSV extracts (robots.txt allows `/dbproduction2/`).
  `lib/scraper/texas.ts` built and registered in `STATE_SCRAPERS` — downloads
  `Lteecele.csv` (Electrical Contractor), `Ltescele.csv` (Electrical Sign Contractor),
  and `ltairref.csv` (A/C & Refrigeration Contractor), filters to active licenses via
  `LICENSE EXPIRATION DATE >= today`, dedupes within TX on `license_number`.
  `scripts/import-texas.js` run successfully — import run
  `9eaeaed7-9d70-4e46-9839-aabdc41754ce`.
  - 34,836 raw rows fetched → 3,033 expired removed, 2,830 within-TX dupes removed
  - **28,973 staged** (`source_state='TX'`)
  - Cross-state 3-layer dedup vs. existing staging (5,924 FL rows): 0 exact-license
    matches, 4 flagged as `fuzzy_name_location`. Final: 28,969 `pending`, 4 `flagged`.
  - Promotable (quality ≥ 6): 12,611. Below threshold: 16,358.
  - **Nothing promoted.**

- **Tennessee** (https://www.tn.gov/commerce/regboards/contractors.html): ✅ done for this session — **blocked**.
  Verification redirects `verify.tn.gov` → `search.cloud.commerce.tn.gov`, a Tyler
  Technologies "Forge"/Entellitrak Next.js SPA. Its backend API
  (`entellitrak/api/endpoints/v1`) requires reCAPTCHA verification and an auth token
  before any query — no static HTML data or bulk export exists, and we will not
  bypass CAPTCHA/auth gating. `lib/scraper/tennessee.ts` built and registered in
  `STATE_SCRAPERS` — probes the portal and returns `robotsBlocked: true`. A
  `registry_imports` row was logged
  (`source_state='TN', status='blocked', robots_blocked=true, records_fetched=0`).
  **0 records staged.** CSV upload fallback required — source TN contractor license
  data via an open-records request to the TN Board for Licensing Contractors, then
  use `/api/admin/registry/upload/TN`.

### SESSION 2 SUMMARY
| State | Status | Staged | Notes |
|---|---|---|---|
| Georgia | Blocked (WAF 403) | 0 | CSV upload fallback needed |
| Texas | ✅ Scraped | 28,973 | 12,611 promotable (≥6); 4 flagged vs FL |
| Tennessee | Blocked (SPA + reCAPTCHA) | 0 | CSV upload fallback needed |

**Total staging after Session 2: 34,897** (5,924 FL + 28,973 TX). **Nothing promoted.**
Promotion for TX (and any future GA/TN CSV uploads) requires explicit user
authorization via `/admin/registry`.

**Reminder for next session: STAGE ONLY.** Do not call `/api/admin/registry/promote`
for any Session 2 records until explicitly authorized by the user.

### ⏳ SESSION 3 — Northeast + Midwest (FUTURE)
- New York: https://www.license.ny.gov/public/licquery.htm
- Pennsylvania: https://www.pals.pa.gov
- Ohio: https://com.ohio.gov/divisions/industrial-compliance/building-department
- Illinois: https://idfpr.illinois.gov

### ⏳ SESSION 4 — Southwest + West Coast (FUTURE)
- Arizona: https://roc.az.gov
- Nevada: https://www.nvcontractorsboard.com
- California: https://www.cslb.ca.gov
- Washington: https://lni.wa.gov/licensing-permits/contractors

### ⏳ SESSION 5 — Outreach System (FUTURE)
- SendGrid subdomain: outreach@mail.tradepronexus.com
- CAN-SPAM compliant email templates (unsubscribe + physical address required)
- Batch sending 50/hour per state
- Unsubscribe and "Remove My Listing" hard-delete flow
- Outreach stats in /admin/registry dashboard

### ⏳ SESSION 6 — Claim Flow + Polish (FUTURE)
- "Claim This Profile" button with email verification
- Unclaimed profile display in directory — clearly labeled, never shown as verified
- "Remove My Listing" hard delete from Supabase
- End-to-end testing all 12 states

### Session Rules (enforced every session)
- Always read ROADMAP.md at session start
- Always respect robots.txt on state sites
- Never scrape more than 1 request per 2 seconds
- Always fall back to CSV upload if a state site blocks scraping
- Never display unclaimed profiles as verified
- Always include "Remove My Listing" option
- CAN-SPAM compliant on all outreach — unsubscribe link and physical address required
- Outreach always sends from outreach@mail.tradepronexus.com, never from main domain
- Outreach master switch is OFF by default — never auto-enable

---

## ⏳ PHASE 4 — LAST (build after platform has real users)
Full verification pipeline: document OCR (AWS Textract), web scan (SerpAPI + OSHA), reference surveys, EIN validation (TIN Check), auto-approve/deny, Stripe refund triggers.
