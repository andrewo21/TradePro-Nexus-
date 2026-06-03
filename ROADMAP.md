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

### ⏳ SESSION 2 — Southeast + South Central (FUTURE)
- Georgia: https://sos.ga.gov/index.php/licensing
- Texas: https://www.tdlr.texas.gov
- Tennessee: https://www.tn.gov/commerce/regboards/contractors.html

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
