# lineaLED CRM — Handoff Document
**Created:** 2026-07-08  
**Purpose:** Everything the next agent (or you) needs to continue building without re-discovering bugs. Use this after completing CORE Steps 10–13, then return for final finishing touches.

---

## Read First (mandatory for any agent)

1. `docs/PROJECT_CONTEXT.md` — what we're building and why  
2. `docs/CORE.md` — schema, build order, calculation engines  
3. `docs/API_CONTRACT.md` — table shapes, RLS intent, edge functions  
4. `logs/log.md` — session history of what's been built  
5. `docs/FLOW_TESTS.md` — manual E2E checklist  

**Rules:** Do not change `docs/API_CONTRACT.md` without flagging it. Do not invent pricing logic. Append completed work to `logs/log.md`.

---

## Current State Summary

### What works end-to-end today

```
Admin Setup (org/project/users/CSV/assign sites)
  → Staff survey (photo + annotation + spec)
  → Quote (PDF + manual price)
  → Admin approve & send email
  → Client acknowledges via email link
  → Client portal shows progress (partial — see bugs)
```

### CORE.md build order status

| Step | Description | Status |
|------|-------------|--------|
| 1 | Schema + RLS | ✅ Applied on remote Supabase — **not in repo** (`supabase/migrations/` empty) |
| 2 | Auth + role routing | ✅ Done |
| 3 | Calculation engines | ⚠️ Built but **test parity failing** — see bugs |
| 4 | Staff dashboard | ✅ Done (scoped to `assigned_staff_id`) |
| 5 | Survey screen | ⚠️ Mostly done — PhotoAnnotator alignment risk |
| 6 | Spec generation | ✅ Done |
| 7 | PDF generation | ⚠️ Mostly done — CORS/storage risks |
| 8 | approve-and-notify | ⚠️ Code done — **must redeploy** edge function |
| 9 | approve-token + email | ⚠️ Code done — **must redeploy**; verify `FRONTEND_URL` secret |
| 10 | Client portal | ⚠️ Partial — `ClientPortal`, `BranchDetail`, `ProgressRollup` exist but multi-project broken |
| 11 | CSV import | ✅ Done — lives in Admin Setup (`ClientOrgSetup.jsx`) |
| 12 | Install flow | ❌ **Not built** — no `InstallScreen.jsx`, no UI to mark `installed` |
| 13 | Demo data + rehearsal | ❌ Not done |

### Repo structure (key files)

```
frontend/src/
  pages/          Login, StaffDashboard, SurveyScreen, QuotePreview,
                  OwnerDashboard, ApprovalDetail, ApprovalLanding,
                  ClientPortal, BranchDetail, ClientOrgSetup
  components/     PhotoAnnotator, SpecCard, StatusBadge, ProgressRollup,
                  CsvImportModal, AnnotatedPhoto
  lib/            calculations.ts, pdfGenerator.ts, supabaseClient.js, edgeFunctions.js
  hooks/          useAuth.js

supabase/
  functions/      approve-and-notify/, approve-token/
  migrations/     EMPTY — schema only on remote DB
```

### Supabase project

- Linked ref in `.temp`: `zvesxwezrbautdyrpgjq`  
- Edge function secrets needed: `RESEND_API_KEY`, `FROM_EMAIL`, `FRONTEND_URL`  
- Storage buckets referenced in code: `site-photos`, `estimates-pdf`, `install-photos` (install bucket unused until Step 12)

---

## Role & Visibility Model (important — user asked about this)

### Client users (`client_user`)

- **Profile link:** `profiles.client_org_id` → organization (NOT project, NOT individual site)
- **RLS (DB):** Can read all sites/boards/estimates in their org (via `projects.client_org_id` chain)
- **UI today (`ClientPortal.jsx`):** Only loads **one project** with `.limit(1)`, then shows sites in that project only
- **Result:** Client with 2 projects under same org may see only 1 project's sites (e.g. "1 site") — this is a **UI bug**, not correct product behavior

### Staff users (`staff`)

- **Site link:** `sites.assigned_staff_id` = staff's `user_id`
- **UI:** `StaffDashboard` filters `.eq('assigned_staff_id', user.id)`
- **Assignment:** Admin Setup → "Assign Unassigned Sites" for selected project + chosen staff user
- Staff with 1 site visible = only 1 site was assigned to them

### Admin users (`admin`)

- Full access via RLS
- Setup wizard at `/admin/setup` (`ClientOrgSetup.jsx`) — not in original CORE build order but needed for demo

---

## Known Bugs (unfixed or partially fixed)

### P0 — Blocks demo / wrong data

| # | Bug | Where | Details |
|---|-----|-------|---------|
| B1 | **No install UI** | Missing `InstallScreen.jsx` | Cannot mark `sites.status = 'installed'` or set `boards.final_photo_url` except manual SQL. CORE Step 12. |
| B2 | **Client portal shows one project only** | `ClientPortal.jsx:33` `.limit(1)` | Multi-project orgs see wrong site count. Should show all org sites OR project picker. |
| B3 | **Calculation engine test failures** | `frontend/test-calc.js` | Many assertions fail vs expected values from source HTML tools. Video wall actualWidthFt, GSB module counts wrong in tests. May mean CRM output ≠ standalone tools. **Verify against `linea_led_estimator.html` and GSB chart before demo.** |
| B4 | **Edge functions not redeployed** | Supabase remote | Local fixes to `approve-and-notify` (email-before-DB) and `approve-token` (race fix) only apply after `supabase functions deploy`. |
| B5 | **Schema not in repo** | `supabase/migrations/` empty | Cannot reproduce DB, review RLS, or onboard new env from git. |

### P1 — Reliability / correctness

| # | Bug | Where | Details |
|---|-----|-------|---------|
| B6 | **GSB dimensions stored as `_ft` but may be inches** | `SurveyScreen.jsx` | Video wall converts to feet before save; GSB stores raw input number in `width_ft`/`height_ft` columns even when entered in inches. PDF shows "ft" label incorrectly. |
| B7 | **PhotoAnnotator canvas alignment** | `PhotoAnnotator.jsx` | Canvas overlay uses `object-contain` image — rectangle may misalign on non-full-width images. CORE flags as schedule risk. |
| B8 | **PhotoAnnotator no resize/drag** | `PhotoAnnotator.jsx` | UI says "drag to adjust" but only supports drawing new rectangle. No touch events for mobile. |
| B9 | **PDF generation CORS** | `pdfGenerator.ts`, storage | `crossOrigin="anonymous"` on images — fails if `site-photos` bucket CORS not configured. PDF may be blank or error. |
| B10 | **PDF uses `getPublicUrl`** | `pdfGenerator.ts` | If `estimates-pdf` bucket is private, stored URL may not work for client download. |
| B11 | **Staff "Add Site" uses fallback project** | `StaffDashboard.jsx:85` | When staff has zero sites, `projects.limit(1)` picks arbitrary project. Should use org's project from admin context or block with message. |
| B12 | **Client user creation via client-side signUp** | `ClientOrgSetup.jsx` | Works with session restore, but fragile: email confirmation settings, existing emails, no admin invite API. Duplicate email now shows clear error (fixed) but not production-grade. |
| B13 | **RLS cross-org isolation never tested** | Remote DB | Log admits this wasn't force-tested. Two fake users in different orgs should be verified before demo. |
| B14 | **approve-and-notify: one client_user per org** | Edge function | Uses `.limit(1)` on client profiles — ambiguous if multiple client users per org. |
| B15 | **Re-survey on approved site** | `SurveyScreen.jsx` | No guard preventing staff from re-surveying `approved`/`installed` sites and resetting to `quoted`. |

### P2 — UX / polish

| # | Bug | Where | Details |
|---|-----|-------|---------|
| B16 | **No realtime on client portal** | `ClientPortal.jsx` | Progress requires manual refresh. Optional per API_CONTRACT §5 but demo script implies "live". |
| B17 | **BranchDetail: no install photo** | `BranchDetail.jsx` | Shows survey photo only; `final_photo_url` never displayed (depends on Step 12). |
| B18 | **BranchDetail: no PDF link** | `BranchDetail.jsx` | Client cannot download quote PDF from portal. |
| B19 | **Client portal: no search/filter** | `ClientPortal.jsx` | 400+ branch CSV import will produce unusable table without pagination/search. |
| B20 | **Owner dashboard: no progress rollup** | `OwnerDashboard.jsx` | Only pending approvals + installed count; no org-wide rollup component. |
| B21 | **CsvImportModal: silent skip count** | `CsvImportModal.jsx` | Invalid rows filtered but no "N rows skipped" summary. |
| B22 | **Missing `services/api.js`** | PROJECT_CONTEXT | Docs mention thin API wrapper; all pages call `supabase` directly. Works but inconsistent. |
| B23 | **Missing `BranchList.jsx`** | PROJECT_CONTEXT | Branch list embedded in `ClientPortal` — acceptable but diverges from spec file list. |
| B24 | **No `supabase/config.toml`** | supabase/ | `approve-token` needs `verify_jwt = false` at deploy — not documented in repo. |

### P3 — Infrastructure / hygiene

| # | Bug | Where | Details |
|---|-----|-------|---------|
| B25 | **Storage bucket policies not in repo** | Supabase remote | `site-photos`, `install-photos`, `estimates-pdf` policies unknown from git. |
| B26 | **CORE.md vs API_CONTRACT RLS on profiles** | Docs | CORE says RLS on all except profiles; API_CONTRACT says all 6 including profiles. Unclear which was applied. |
| B27 | **sites.assigned_staff_id FK** | CORE.md schema | References `profiles(id)` but profiles PK is `user_id` — likely doc typo; verify on live DB. |
| B28 | **Nested `.temp` artifact** | `supabase/functions/approve-and-notify/supabase/.temp/` | Accidental CLI folder — safe to delete. |
| B29 | **Large JS bundle warning** | `npm run build` | Main chunk >500KB (html2canvas + jspdf). Consider code-splitting later. |

---

## Improvements Backlog (for "final finishing touches" chat)

These are NOT blockers for Steps 10–13 but should be done before a real demo:

1. **Fix client portal multi-project** — project dropdown or aggregate all org sites in rollup  
2. **Build InstallScreen** — `/staff/install/:siteId`, upload `install-photos`, set `final_photo_url`, status → `installed`  
3. **Verify calculation engines** — run side-by-side with source HTML tools, fix `calculations.ts` until `test-calc.js` passes  
4. **Export SQL migrations** — dump remote schema + RLS + triggers + storage policies to `supabase/migrations/`  
5. **Admin invite edge function** — replace client-side `signUp` for user creation  
6. **PhotoAnnotator hardening** — alignment fix, touch support, optional resize handles  
7. **Client portal PDF download** — link to `estimates.pdf_url` on `BranchDetail`  
8. **Realtime subscriptions** — `sites` changes scoped by org/project  
9. **Status transition guards** — enforce CORE §2 sequence in UI (no re-quote on installed, etc.)  
10. **Seed script** — 3–5 realistic sites for cold demo rehearsal (Step 13)  
11. **Pagination** on client branch list and staff site list  
12. **Redeploy edge functions** and verify full email loop on production `FRONTEND_URL`  

---

## Deploy Checklist (do before demo)

- [ ] `frontend/.env` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
- [ ] `supabase secrets set RESEND_API_KEY=...`  
- [ ] `supabase secrets set FROM_EMAIL=quotes@aaditya-sinha.xyz`  
- [ ] `supabase secrets set FRONTEND_URL=https://your-vercel-app.vercel.app`  
- [ ] `supabase functions deploy approve-and-notify`  
- [ ] `supabase functions deploy approve-token` (ensure JWT verification disabled for this function)  
- [ ] Storage buckets exist with CORS for `site-photos` (needed for PDF)  
- [ ] Run `docs/FLOW_TESTS.md` — all flows Pass  
- [ ] Warm up edge functions 5 min before live demo (cold start)  

---

## What the Next Agent Should Build (Steps 10–13)

You said you'll complete these with the old agent first. For reference:

### Step 10 — Client portal (partially done, needs fix)
- `ClientPortal.jsx`, `BranchDetail.jsx`, `ProgressRollup.jsx` exist  
- **Must fix:** multi-project visibility (B2)  
- **Should add:** PDF link on branch detail, install photo when Step 12 exists  

### Step 11 — CSV import (done)
- `CsvImportModal.jsx` in Admin Setup  
- Verify row validation + correct site count after import  

### Step 12 — Install flow (NOT started)
- Create `InstallScreen.jsx`  
- Route: `/staff/install/:siteId` in `App.jsx`  
- Staff dashboard: "Install" action for `approved` sites  
- Upload to `install-photos/{site_id}/installed.jpg`  
- Update `boards.final_photo_url`, `sites.status = 'installed'`  
- Client portal + BranchDetail show install photo when `installed`  

### Step 13 — Demo rehearsal
- Seed data, two clean end-to-end run-throughs  
- Use `docs/FLOW_TESTS.md`  

---

## Copy-Paste Prompt for Next Chat (Steps 10–13 agent)

```
You are continuing work on the lineaLED CRM project.

BEFORE writing any code:
1. Read docs/PROJECT_CONTEXT.md, docs/CORE.md, docs/API_CONTRACT.md
2. Read logs/log.md (session history) and logs/HANDOFF.md (bugs + current state)
3. Read docs/FLOW_TESTS.md (E2E checklist)

CONTEXT:
- React + Vite frontend, Supabase (Auth/Postgres/RLS/Storage), 2 edge functions
- Steps 1–9 largely done; Step 11 (CSV) done in Admin Setup
- A prior session fixed admin setup bugs, staff scoping, approval flow — see log entry "Bug fixes + Admin Setup refinement"
- Do NOT re-build what's already working unless fixing a listed bug

YOUR TASK — complete CORE.md build order Steps 10–13:

Step 10: Finish client portal
- ClientPortal.jsx, BranchDetail.jsx, ProgressRollup.jsx already exist
- FIX: ClientPortal uses projects.limit(1) — client users linked to ORG not project; must show all org sites or add project picker (see HANDOFF.md bug B2)
- Ensure progress rollup numbers match DB exactly under client_user RLS

Step 11: CSV import — verify done
- CsvImportModal is in ClientOrgSetup.jsx (admin only)
- Confirm bulk insert works, status defaults to not_surveyed

Step 12: Install flow — NOT BUILT YET
- Create InstallScreen.jsx: final photo upload to install-photos bucket, boards.final_photo_url, sites.status → installed
- Route /staff/install/:siteId, staff action on approved sites
- Only valid transition: approved → installed (CORE §2)

Step 13: Demo data + rehearsal
- Seed 3–5 realistic sites, run full click-path twice per docs/FLOW_TESTS.md
- No manual DB fixes mid-flow

RULES:
- Do not invent pricing logic (manual_price only)
- Do not change docs/API_CONTRACT.md without flagging
- Append honest log entry to logs/log.md when done
- Edge functions already exist — redeploy if you change them

After completing, note anything still broken for the "final finishing touches" pass (see HANDOFF.md improvements backlog).
```

---

## Copy-Paste Prompt for "Final Finishing Touches" Chat (after Steps 10–13)

```
You are doing the final polish pass on lineaLED CRM after Steps 10–13 were completed.

BEFORE writing any code:
1. Read docs/PROJECT_CONTEXT.md, docs/CORE.md, docs/API_CONTRACT.md
2. Read logs/log.md (latest entries) and logs/HANDOFF.md (full bug list)
3. Run docs/FLOW_TESTS.md and note any failures

CONTEXT:
- Core flows should work: survey → quote → approve → email → client portal → install
- This pass is about fixing remaining bugs and demo-readiness, NOT new features

PRIORITY ORDER (from logs/HANDOFF.md):
1. Verify calculation engines — run `npx tsx frontend/test-calc.js`, fix calculations.ts until output matches source HTML tools (bug B3)
2. Export supabase/migrations/ from remote schema + RLS + storage policies (bug B5, B25)
3. Fix GSB dimension labeling/storage when entered in inches (bug B6)
4. PhotoAnnotator alignment + touch (bugs B7, B8)
5. PDF/storage CORS issues (bugs B9, B10)
6. Admin invite edge function to replace client-side signUp (bug B12)
7. Realtime on client portal (bug B16) — optional if time
8. RLS cross-org isolation test with two fake orgs (bug B13)
9. Redeploy edge functions, verify production email link with FRONTEND_URL
10. Two clean demo rehearsals (Step 13)

RULES:
- Minimize scope — fix what's listed, don't refactor unrelated code
- Append log entry to logs/log.md when done
- Do not change API_CONTRACT without flagging

Start by reading HANDOFF.md bug table and confirming which bugs Step 10–13 agent already fixed vs still open.
```

---

## Quick Reference: How to Mark a Site Installed (today vs intended)

**Today (manual):**
```sql
UPDATE sites SET status = 'installed' WHERE id = '<uuid>';
UPDATE boards SET final_photo_url = '<path-in-install-photos-bucket>' WHERE site_id = '<uuid>';
```

**Intended (after Step 12):**
Staff → approved site → Install → upload photo → saves automatically.

---

## Session Notes

- User prefers no lineaLED branding in UI (generic "Sign In", "Staff Dashboard", etc.)
- User will complete Steps 10–13 with prior agent, then return for finishing touches using this doc
- `logs/aditya.local.md` mentioned in standing instructions — use `logs/log.md` for project log (or both if user prefers)

---

*Last updated: 2026-07-08 — after "Bug fixes + Admin Setup refinement" session*
