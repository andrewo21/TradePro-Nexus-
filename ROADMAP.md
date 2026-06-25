# TradePro Nexus — Product Roadmap

## ✅ PHASE 14 — COMPLETE (Visual Redesign + Trade Pros Near You)

1. **Homepage redesign** (`/`) — Complete visual overhaul: white sticky navbar with TradePro Nexus logo + center nav links + Sign In / Join Free buttons; dark navy hero with "Now Live in 7 States" badge, split-color H1, four live stat boxes (directory count from `/api/stats`, 7 states, Free, 5 min); orange "Verified by Paper. Not by Algorithm." strip; two-column features section on white background (Trade Pro / GC split); dark navy "How it works" 3-step section; full-width orange CTA; minimal dark footer. All em dashes removed. Mobile responsive with hamburger menu.

2. **Feed three-column redesign** (`/feed`) — White left sidebar + dark navy center (unchanged) + white right sidebar. Left sidebar: Your Profile card (avatar initials, name, trade, availability), Quick Links (Find Crews / Union Jobs / Refer and Earn / Get Verified), Platform Stats (live contractors count, 7 states, available now count). Right sidebar: Trade Pros Near You (pulls 5 profiles from user's state or FL default, links to `/search?state=X`), Suggested Connections (3 unfollowed profiles with Follow button, hidden when logged out). Center feed: zero changes to existing functionality, post logic, reactions, comments. Sidebars collapse on mobile, center takes full width. "Work is Currency." headline updated with "Currency." in orange. DesktopAdRail replaced by sidebars.

---

## ✅ PHASE 13 — COMPLETE

1. **SendGrid suppression sync** — Unsubscribe and remove actions now call SendGrid global suppression API. Admin backfill endpoint at `POST /api/admin/registry/sendgrid-sync` (call once from deployed site to sync 4 existing suppressed records).
2. **Footer entity fix** — All 12 instances of "TradePro Enterprises" replaced with "TradePro Technologies LLC" across app pages, emails, and edge functions.
3. **Post comments UI** — `post_comments` table, `GET/POST /api/feed/[id]/comments`, `CommentSection` component in feed, batch comment counts via RPC, 12 seed comments on bot posts, seed accounts excluded from `active_commenting_users` metric.
4. **GA4 claim_profile event** — Fires on both magic claim (2-click) and authenticated claim paths. Properties: `business_name`, `trade_type`, `state`, `source`.
5. **Southeast registry** — Virginia: 80,991 records staged, 80,961 promotable, promote cron running. NC/SC/AL blocked; scrapers built and ready; FOIA/public records requests needed.
6. **Legal entity update** — Identified all locations requiring update to "TradePro Nexus Inc." — pending Delaware C-Corp EIN arrival. No changes made.
7. **Search result count** — "Showing X contractors in [State]" / "matching your filters" — live count from same query, updates on every filter change.
8. **Active Member badge** — Already triggered on first post. Seed accounts now excluded at top of `checkAndAwardBadges` (all triggers). Badge displays on Trade Card with `BadgeCelebration` notification.
9. **First post badge notification email** — Sends via SendGrid when `active_member` is awarded. Includes badge confirmation, referral link, discount progress toward verification, CTA to Trade Card.

---

## ✅ PHASE 12 — COMPLETE (Referral Engine + Advertising Page + Verification Discount Storage)

1. **Referral engine** — `referral_tracking` table (referrer_id, referred_user_id, status, created_at). Unique referral link per user at `/signup?ref={user_id}`. Ref param captured in signup flow; on completion calls `POST /api/referral/credit` which inserts the referral row, recalculates the referrer's discount tier, and sends a SendGrid notification email. Reward tiers stored in `profiles.verification_discount_pct` (0/10/20/100%). Dashboard on `/account` shows count, progress bar, tier breakdown, copy link, and share buttons (text/email/native share). "Refer and Earn" CTA added to post-profile-creation success screen in `/build`.

2. **Advertising page** (`/advertise`) rebuilt with: live directory count pulled from `/api/stats`, audience stats (422K+ contractors, 12 states, trades, union), 4 pricing tiers ($500/$1K/$2.5K/Enterprise), each tier links to `mailto:` with subject pre-filled as "Advertising Inquiry — {tier}". "Advertise With Us" added to global footer.

3. **`profiles.verification_discount_pct` (INTEGER DEFAULT 0)** — stores referral-earned verification discount. Updated automatically by the referral credit API based on referral count tiers:
   - 0 referrals → 0%
   - 1–2 referrals → 10% off ($99 × 0.90 = $89.10)
   - 3–9 referrals → 20% off ($99 × 0.80 = $79.20)
   - 10+ referrals → 100% off (free)

   **Phase 4 integration note:** When verification Stripe checkout launches, read `profiles.verification_discount_pct` for the purchasing user and apply a percentage discount at checkout. The field is already populated — just hook it into the Stripe `checkout.sessions.create` call as a coupon or price override. Never auto-apply — verify the field at checkout time so it reflects the latest referral count.

---

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

**TradePro Tech integration contract (POST /api/resume-import):**
- Auth: `secret` field must match `RESUME_IMPORT_SECRET` env var (set in `.env.local`).
- Required: `user_email`, `first_name`, `last_name`.
- Optional profile fields: `phone`, `location_city`, `location_state`, `location_zip`, `trade`, `years_experience`, `certifications` (string[] → `other_certifications`), `bio`, `availability_status`.
- If no Nexus account exists for `user_email`: returns `{ imported: false, action: "signup_required", signup_url }`.
- If profile exists: updates it and returns `{ imported: true, action: "updated", profile_slug, profile_url }`.
- If no profile yet: creates one and returns `{ imported: true, action: "created", profile_slug, profile_url }`.
- `profile_url` is always `https://tradepronexus.com/pro/{slug}` on a successful import.

## ✅ PHASE 9 — COMPLETE
All policy pages (/policy/*), platform trust statement on homepage, no-grade pledge, full footer policy nav.

## ✅ PHASE 10 — COMPLETE
Inspector, Architect, Engineer profile types. Type-specific build form, Trading Card display, search filter, verification doc requirements.

## ✅ PHASE 11 — COMPLETE (Union Partnership Program)
Built for the IUJAT / national union partnership launch.

1. **Union profile fields** — Union Member (yes/no), Union Name, Local Number, Member
   Status, Prevailing Wage Certified, Davis-Bacon Eligible, Union Card Expiration
   added to the trade pro/sub profile builder and displayed on the Trade Card when
   filled. Self-reported only — never auto-assigned.
2. **Union badge** — distinct "Union Member" badge (slate blue, shield icon) on the
   Trade Card, visually separate from the verification badge.
3. **Union filter in directory** — "Union Members Only" toggle in Find Crews, plus
   "Union" as a searchable tag.
4. **/work rebuild** — Union Opportunities job board (Section B) alongside the
   existing General Opportunities Coming Soon (Section A): job cards (trade,
   location, job type, union requirement, prevailing wage, Davis-Bacon, posted by,
   date), filter bar, 6 seed sample postings, "Get Notified" email capture
   (`source="union_opportunities"`), nav link to `/work#union`.
5. **Job placement flow** — `open_to_union_jobs_only` / `seeking_prevailing_wage_work`
   profile preferences (Account page); `/post-job` form for GCs (free during launch);
   `jobs` table with `pending`/`approved`/`removed` workflow; `/admin/jobs` approval
   dashboard; SendGrid confirmation email to the posting GC; automatic matching
   against available trade pros in the same state/trade (Union Only postings require
   `union_member = true`), up to 10 notification emails per posting.
6. **Union partner landing pages** — `/partners/[slug]` template (`lib/partners.ts`)
   for IUJAT, IBEW, UA, Carpenters, Ironworkers, Laborers, Operating Engineers, Sheet
   Metal Workers, Painters, Roofers. Co-branded header (union color → orange →
   navy), 4 value props, waitlist signup (`source="{slug}_partner"`), `{NAME}10`
   promo code linking to tradeprotech.ai, QR code for union-hall handouts.
7. **Resume to Nexus flow** — `/api/resume-import` verified end-to-end; `updated`
   responses now also return `profile_url` (previously only `created` did). See
   Phase 8 for the full integration contract.

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

### ✅ SESSION 3 — COMPLETE (Northeast + Midwest) — all four blocked

- **New York** (https://www.license.ny.gov/public/licquery.htm): ✅ done — **blocked**.
  `license.ny.gov` no longer resolves to a working host (connection times out).
  The live system is `appext20.dos.ny.gov/lcns_public/` — its search *forms*
  (chk_load, bus_name_search_frm, lic_name_search_frm, id_search_frm) still
  render and list "Home Inspection" (code HIN, maps to our Inspector profile
  type) and "Alarm Installer" — but every search-submission endpoint
  (bus_name_search_cursor_new, lic_name_search_cursor_new,
  lcns_query.id_search_cursor) returns HTTP 404 "page unavailable", a
  decommissioned-system redirect page. `lib/scraper/newyork.ts` built and
  registered in `STATE_SCRAPERS` — probes the search backend and returns
  `robotsBlocked: true`. Import run `1f61a7f6-382b-45a1-9760-3bb90e0a5131`
  logged (`source_state='NY', status='blocked', robots_blocked=true,
  records_fetched=0`). **0 records staged.** CSV upload fallback required —
  source NY Home Inspector / Alarm Installer license data via an open-records
  request to the NY Dept of State, Division of Licensing Services, then use
  `/api/admin/registry/upload/NY`.

- **Pennsylvania** (https://www.pals.pa.gov): ✅ done — **blocked**.
  PALS ("BPOA Portal") is an Angular SPA (`data-ng-app="bpoaApp"`) that loads
  reCAPTCHA v3 (explicit render) on initial page load and gates license
  verification search behind it — same pattern as Tennessee (Session 2). No
  server-rendered result table or bulk export exists. `lib/scraper/pennsylvania.ts`
  built and registered in `STATE_SCRAPERS` — probes the portal and returns
  `robotsBlocked: true`. Import run `30e8fcdb-f44a-48fd-9359-5c6d3149d23b`
  logged (`source_state='PA', status='blocked', robots_blocked=true,
  records_fetched=0`). **0 records staged.** CSV upload fallback required —
  source PA contractor/trade license data via a Right-to-Know request to the
  PA Dept. of State, Bureau of Professional and Occupational Affairs, then use
  `/api/admin/registry/upload/PA`.

- **Ohio** (https://com.ohio.gov/divisions/industrial-compliance/building-department):
  ✅ done — **blocked**. That URL 404s; license verification has moved to
  `elicense.ohio.gov` (Salesforce Experience Cloud). `/OH_VerifyLicense` is a
  server-rendered JSF page with LicenseType/LicenseNumber search fields, but
  it embeds a Google reCAPTCHA (`grecaptcha.render('verifyLandingCaptcha', ...)`)
  that gates submission. `lib/scraper/ohio.ts` built and registered in
  `STATE_SCRAPERS` — probes the page and returns `robotsBlocked: true`. Import
  run `32fa99d2-b991-4c3e-b106-cc4c76c79133` logged (`source_state='OH',
  status='blocked', robots_blocked=true, records_fetched=0`). **0 records
  staged.**
  > **REVERSED in Session 4** — `elicense4.com.ohio.gov` (a *different* host
  > from the reCAPTCHA-gated `elicense.ohio.gov`) has a free, no-CAPTCHA
  > "Roster Download" bulk export. See Session 4 entry below — 12,550 OCILB
  > records staged.

- **Illinois** (https://idfpr.illinois.gov): ✅ done — **blocked**.
  idfpr.illinois.gov's robots.txt allows everything, but it has no search form
  itself — license lookup is on `online-dfpr.micropact.com/Lookup/LicenseLookup.aspx`,
  which has a "ROOFING CONTRACTOR" license type but requires solving a
  FormShield CAPTCHA (image + audio) before search submission.
  idfpr.illinois.gov only publishes a monthly "Active License Report" as PDF
  (not CSV/structured data), so it can't be used as a bulk fallback.
  `lib/scraper/illinois.ts` built and registered in `STATE_SCRAPERS` — probes
  the lookup page and returns `robotsBlocked: true`. Import run
  `ceb040d1-eacf-486d-afdf-6394df105e2c` logged (`source_state='IL',
  status='blocked', robots_blocked=true, records_fetched=0`). **0 records
  staged.** CSV upload fallback required — source Illinois Roofing Contractor
  license data via a FOIA request to IDFPR, then use
  `/api/admin/registry/upload/IL`.

### SESSION 3 SUMMARY
| State | Status | Staged | Notes |
|---|---|---|---|
| New York | Blocked (search backend decommissioned) | 0 | CSV upload fallback needed (Home Inspector / Alarm Installer) |
| Pennsylvania | Blocked (Angular SPA + reCAPTCHA v3) | 0 | CSV upload fallback needed |
| Ohio | Blocked (Salesforce + reCAPTCHA) | 0 | CSV upload fallback needed |
| Illinois | Blocked (FormShield CAPTCHA) | 0 | CSV upload fallback needed (Roofing Contractor) |

**Total staging after Session 3: unchanged at 34,897** (5,924 FL + 28,973 TX
from Sessions 1-2). **Nothing promoted.**

**Reminder for next session: STAGE ONLY.** Do not call
`/api/admin/registry/promote` for any staged records until explicitly
authorized by the user.

### 🔄 SESSION 4 — Southwest + West Coast (IN PROGRESS)

- **California** (https://www.cslb.ca.gov): ✅ done — **scraped successfully**.
  CSLB's Public Data Portal (`/onlineservices/dataportal/ContractorList`) is
  classic ASP.NET WebForms with no robots.txt (fails open). `lib/scraper/california.ts`
  built and registered in `STATE_SCRAPERS` — walks the 3-step postback dance
  (select "License Master" → click download link → follow 302) to fetch the
  free Master License File CSV (~75MB), filters to active
  (`PrimaryStatus='CLEAR'` AND `ExpirationDate >= today`), dedupes within CA on
  `LicenseNo`. `scripts/import-california.js` run successfully — import run
  `90f22962-c0f8-4e65-b1e4-483c6c27f590`.
  - 243,559 raw rows fetched → 10,653 not CLEAR removed, 1 expired removed,
    0 within-CA dupes
  - **232,905 staged** (`source_state='CA'`)
  - **Nothing promoted.**

- **Arizona** (https://roc.az.gov): ✅ done — **blocked**.
  roc.az.gov sits entirely behind a Cloudflare WAF challenge — every request,
  including robots.txt itself, returns HTTP 403 with `cf-mitigated: challenge`
  (same pattern as Georgia, Session 2). Its license-search backend
  (`azroc.my.site.com/AZRoc/s/contractor-search`) is a Salesforce Experience
  Cloud Lightning SPA whose CSP whitelists Google reCAPTCHA — no
  server-rendered search or bulk export is reachable. `lib/scraper/arizona.ts`
  built and registered in `STATE_SCRAPERS` — probes roc.az.gov and returns
  `robotsBlocked: true`. Import run `fb0130ac-a525-4209-aadd-33b226a404f2`
  logged (`source_state='AZ', status='blocked', robots_blocked=true,
  records_fetched=0`). **0 records staged.** CSV upload fallback required —
  source AZ contractor license data via a public-records request to the AZ
  Registrar of Contractors, then use `/api/admin/registry/upload/AZ`.

- **Nevada** (https://www.nvcontractorsboard.com): ✅ done — **scraped successfully**.
  The marketing site links to a separate ASP.NET app
  (`app.nvcontractorsboard.com/Clients/nvscb/Public/ContractorListing/ListingSearch.aspx`),
  whose robots.txt returns 404 (fails open). The search form has only two
  dropdowns — County and Primary Classification — both offering "All" (value
  "0"). `lib/scraper/nevada.ts` built and registered in `STATE_SCRAPERS` —
  submits County=All + Classification=All via a single ASP.NET postback,
  which returns every licensed contractor in one server-rendered
  `ListingResults.aspx` page (~19K rows, no pagination, no CAPTCHA). Filters
  to active (`status` starts with "Active" AND `Expires >= today`).
  `scripts/import-nevada.js` run successfully — import run
  `3ed7d145-75f4-4565-810d-8a09818c7624`.
  - 19,004 raw rows fetched → 0 inactive removed, 37 expired removed, 0
    missing-field removed
  - **18,967 staged** (`source_state='NV'`)
  - **Nothing promoted.**

- **Ohio** (https://elicense4.com.ohio.gov/Lookup/GenerateRoster.aspx): ✅ done —
  **scraped successfully** (reverses the Session 3 "blocked" verdict, which
  was about the *separate*, reCAPTCHA-gated `elicense.ohio.gov/OH_VerifyLicense`
  search form). `elicense4.com.ohio.gov` hosts a free, no-login, no-CAPTCHA
  "Roster Download" bulk-export tool (robots.txt 404s, fails open). Flow:
  GET `GenerateRoster.aspx` → POST checking the "OCLIB" board checkbox
  (`ckbRoster0`) + `btnRosterContinue` → 302 to `DownloadRoster.aspx`, which
  lists a generated OCILB roster job with a dynamic `RosterIdnt` (e.g.
  187050) → GET `/Lookup/FileDownload.aspx?Idnt={RosterIdnt}&Type=Comma`
  (same session cookies) returns the CSV directly — discovered via
  `Lookup.js`'s `OpenFileDownloadWindow`, which does
  `window.open("FileDownload.aspx?Idnt=" + idnt + "&Type=" + format)` (a plain
  GET, not a form POST as initially assumed). Covers six OCILB trade
  licenses: Electrical, HVAC, Plumbing, Hydronics, Refrigeration, Tradesman.
  Filters to active (`Status` is "ACTIVE" or "ACTIVE IN RENEWAL" AND
  `Expiration Date >= today`). `lib/scraper/ohio.ts` rewritten and
  `scripts/import-ohio.js` built. Run successfully — import run
  `422f674c-9d77-4861-ae9d-0ff293063225`.
  - 12,621 raw rows fetched → 0 inactive removed, 64 expired removed, 7
    within-OH dupes removed
  - **12,550 staged** (`source_state='OH'`) — breakdown: Electrical 4,457,
    HVAC 3,103, Plumbing 3,047, Hydronics 965, Refrigeration 816,
    Tradesman 162
  - Quality score distribution: 5→262, 6→4,086, 7→6, 8→7,744, 10→452
    (12,288 promotable at ≥6, 262 below threshold)
  - Cross-state dedup: 0 matches (no prior OH records — structurally
    guaranteed for a brand-new state since `check_registry_duplicate` scopes
    all checks to `source_state`)
  - **Nothing promoted.**

- **Washington** (https://lni.wa.gov/licensing-permits/contractors): ✅ done —
  **scraped successfully**. The L&I "Verify a Contractor" tool
  (`secure.lni.wa.gov/verify/`) is an individual-lookup form only (Name /
  License / Account / UBI, no CAPTCHA but no bulk export either). Instead, L&I
  publishes its full contractor license register as an open dataset on
  `data.wa.gov` — "L&I Contractor License Data - General" (id `m8qx-ubtq`,
  ~160K total rows incl. expired/suspended/etc.) via the Socrata SODA REST
  API (plain JSON, no login). robots.txt allows `/resource/*` (only
  `/browse`, `/catalog`, `/facet` query-param variants disallowed;
  `Crawl-delay: 1`, we used the standard 2s delay). Fetched all
  `contractorlicensestatus='ACTIVE'` rows via `$limit=50000` pagination (2
  pages), filtered to unexpired (`licenseexpirationdate >= today`). Covers
  four license types: Construction Contractor (CC), Electrical Contractor
  (EC), Plumbing Contractor (PC), Elevator Contractor (LC).
  `lib/scraper/washington.ts` built and registered in `STATE_SCRAPERS`,
  `scripts/import-washington.js` built and run successfully — import run
  `c2584186-baaa-44de-b75e-2d5ecdbf254b`.
  - 75,362 raw ACTIVE rows fetched → 66 expired removed, 0 missing-field
    removed, 0 within-WA dupes
  - **75,296 staged** (`source_state='WA'`) — breakdown: Construction
    Contractor 67,570, Electrical Contractor 5,481, Plumbing Contractor
    2,166, Elevator Contractor 79
  - Quality score distribution: 6→39, 7→4, 8→75,253 (75,296 promotable at
    ≥6, 0 below threshold)
  - Cross-state dedup: 0 matches (no prior WA records — structurally
    guaranteed for a brand-new state since `check_registry_duplicate` scopes
    all checks to `source_state`)
  - **Nothing promoted.**

- **Florida re-import** (https://www2.myfloridalicense.com): ✅ done —
  **scraped successfully**, replacing the Session 1 CBC/CGC-only import.
  The Session 1 import used a lead-gen Desktop CSV covering only two
  occupation codes (CBC, CGC) and produced just 5,924 records — far short of
  Florida's actual contractor population. DBPR publishes official "Public
  Records" bulk weekly extracts at `www2.myfloridalicense.com` (robots.txt
  allows `/sto/file_download/extracts/*`, fails open otherwise): Construction
  Industry — Board 06 (`CONSTRUCTIONLICENSE_1.csv`, 267,436 rows) and
  Electrical Contractors — Board 08 (`lic08el.csv`, 21,337 rows), no header
  row, 22 columns per DBPR's published ReadMe. `lib/scraper/florida.ts`
  rewritten entirely (the prior `wl11.asp` ViewState scraper was fictional —
  that legacy ASP wizard returns 0 results for bulk "all licenses of type X"
  queries and was abandoned). Filters to active/in-good-standing
  (`PrimaryStatus='C'` AND `SecondaryStatus='A'`), excludes CE-course codes
  (CRS1/CRS2/CRS3), covers all 37 Board 06 + Board 08 occupation codes (CGC,
  CBC, CAC, CCC, CFC, CRC, CPC, SCC, CUC, CMC, CSC, PCC, CVC, registered
  variants, QB, FRO, EC, ER, ES, EF, EG, EY, EZ, EH, EI, ET).
  `scripts/import-florida-dbpr.js` run successfully — import run
  `7170ccab-3580-4032-828e-a25280573952`.
  - 288,773 raw rows fetched (both extracts) → 158,538 not active (C/A)
    removed, 1 CE-course code removed, 0 missing-field/malformed
  - 130,234 active records → 9,745 within-fetch dupes removed → 120,489
    deduped
  - Cross-record dedup against existing FL registry (5,924 in
    `registry_staging` + 4,950 in `unclaimed_profiles`, 5,924 unique license
    numbers): 5,529 already-present records excluded
  - **114,960 newly staged** (`source_state='FL'`)
  - Quality score distribution: 4→1, 5→1,943, 6→113,016 (113,016 promotable
    at ≥6, 1,944 below threshold)
  - **Nothing promoted.** New FL total in `registry_staging`: **120,884**
    (5,924 prior + 114,960 new).

### SESSION 4 SUMMARY (so far)
| State | Status | Staged | Notes |
|---|---|---|---|
| California | ✅ Scraped | 232,905 | Master License File CSV via portal postback |
| Arizona | Blocked (Cloudflare WAF + reCAPTCHA SPA) | 0 | CSV upload fallback needed |
| Nevada | ✅ Scraped | 18,967 | Single-page ListingResults.aspx, County=All/Classification=All |
| Ohio | ✅ Scraped | 12,550 | Roster Download bulk CSV (elicense4.com.ohio.gov), reverses Session 3 block |
| Washington | ✅ Scraped | 75,296 | data.wa.gov Socrata SODA API (L&I Contractor License Data - General) |
| Florida (re-import) | ✅ Scraped | +114,960 | DBPR Public Records bulk CSVs, all 37 Board 06/08 codes, replaces CBC/CGC-only Session 1 import |

**Total staging after Session 4 (so far): 489,575** (120,884 FL + 28,973 TX +
232,905 CA + 18,967 NV + 12,550 OH + 75,296 WA). **Nothing promoted.**

**Authorized & built (2026-06-11):** Auto-promote cron (`promote_registry_batch`,
pg_cron job `auto-promote-registry`, every 5 min, batch 1,000, quality >= 6,
logs to `registry_imports` with `import_type='promote'`, self-unschedules when
`registry_staging` has 0 `pending` rows). 483,647 pending at launch (~465K
qualify), so this will run continuously for roughly 40 hours. Progress visible
on /admin/registry via the "Auto-Promote" status bar and Import Runs tab.

### ✅ SESSION 5 — Outreach System (built, master switch OFF)
- SendGrid subdomain: outreach@mail.tradepronexus.com (edge function `send-outreach-batch`,
  pg_cron job `send-outreach-batch`, hourly, checks `outreach_enabled` first and no-ops if not `'true'`)
- CAN-SPAM compliant email template (unsubscribe + "Remove My Listing" + physical
  address). `admin_settings.outreach_physical_address` is set to
  TradePro Technologies LLC | TradePro Nexus, 17629 Fallen Branch Way, Punta Gorda, FL 33982
  (corrected from the earlier 1984 Polo Lakes Drive East placeholder).
- Batch sending via `admin_settings.outreach_batch_size` (default 50/hour)
- `/unsubscribe?token=...&action=unsubscribe|remove` — unsubscribe sets
  `outreach_eligible=false`; remove hard-deletes the profile (cascades to outreach_log)
- Outreach stats (sent/failed/unsubscribed/queued, last run) in /admin/registry dashboard
- Claim CTA links to `/build?claim=<token>&business=...` — full token verification is Session 6
- `outreach_log.email_number` (1-4) tracks which template was sent per recipient
- **Email 1** — `send-outreach-batch`, hourly cron, initial "claim your listing" outreach
- **Email 2** — `send-outreach-followup`, daily cron (14:00 UTC), one-time "still
  unclaimed" follow-up sent only to recipients who never opened Email 1, 30+ days
  after it was sent. CAN-SPAM disclosure included.
- **Email 3** — `send-claim-welcome`, transactional (no CAN-SPAM disclosure), called
  via `POST /functions/v1/send-claim-welcome { unclaimed_profile_id }` when a profile
  is claimed. NOT YET WIRED UP — Session 6 should call this after setting
  `unclaimed_profiles.claimed = true`.
- **Email 4** — `send-verification-launch`, one-time announcement for claimed profiles
  when verification opens. CAN-SPAM disclosure included. NOT scheduled in pg_cron —
  invoke manually when Phase 4 launches.
- All four templates end with the standard footer: "TradePro Technologies LLC |
  TradePro Nexus", physical address, unsubscribe link, and remove-listing link.

### ⏳ SESSION 6 — Claim Flow + Polish (FUTURE)
- "Claim This Profile" button with email verification
- Unclaimed profile display in directory — clearly labeled, never shown as verified
- "Remove My Listing" hard delete from Supabase
- End-to-end testing all 12 states
- After a profile is claimed, call `send-claim-welcome` (Email 3) with the
  `unclaimed_profile_id` to send the welcome email

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

When this pipeline launches, manually invoke the `send-verification-launch` edge
function (Email 4, built in Session 5) to announce verification to all claimed
profiles with an email on file.
