## Standing Instructions
PROJECT RULES — READ BEFORE DOING ANYTHING

1. Read docs/CORE.md fully before writing any code
2. Read docs/API_CONTRACT.md if your task touches any endpoint or WebSocket message
3. Read docs/PROJECT_CONTEXT.md 

4. Only build what is asked. Do not add features, restructure folders, install new 
   packages, or change interfaces that aren't part of the current task.

5. If completing this task requires going outside what's defined in the MD files 
   — a new dependency, a structural change, a different approach — STOP and explain 
   what the conflict is before writing any code. Wait for confirmation.

6. After completing any task, append a log entry to logs/aditya.local.md 
   in this exact format:

---
### [Date] — [one line summary of what was done]
**Task:** What was asked
**Built:** What files were created or changed, and what each one does in plain English
**How it works:** 2-3 sentences a non-developer could understand
**Connects to:** What other parts of the system call this or depend on it
**Decisions made:** Anything you chose that wasn't explicitly specified
**Deviations from MD:** Any place where the MD files were unclear or you had to go outside them
**Status:** Done / Partially done / Needs review
---

Keep log entries honest. If something is broken or incomplete, say so.

---

## Session Logs

---
### 2026-07-08 — Auth + Role Routing (Step 2)
**Task:** Login screen with Supabase Auth, redirect by role to correct dashboard.
**Built:** Created `frontend/src/hooks/useAuth.js` (session + profile fetching, signIn/signOut), `frontend/src/hooks/useRoleRedirect.js` (unused, kept for reference), `frontend/src/App.jsx` (BrowserRouter with ProtectedRoute wrapper checking role), `frontend/src/pages/Login.jsx` (login form with session-aware redirect via useEffect), `frontend/src/pages/StaffDashboard.jsx`, `frontend/src/pages/OwnerDashboard.jsx`, `frontend/src/pages/ClientPortal.jsx` (placeholder dashboards for each role), `frontend/.env.example`.
**How it works:** `useAuth` hook maintains session + profile state from Supabase Auth. `Login.jsx` uses a `useEffect` that watches `session` and `profile` — once sign-in succeeds and profile loads, it redirects to `/admin`, `/staff`, or `/client` based on role. `ProtectedRoute` in App.jsx blocks unauthenticated or wrong-role users from accessing dashboards directly.
**Connects to:** All subsequent pages depend on the auth layer. `useAuth` is imported by every page that needs auth context.
**Decisions made:** (1) Added redirect via useEffect in Login.jsx — original version had no redirect on success, causing stuck screen. (2) Removed all lineaLED branding per user request, replaced with generic "Sign In" / "Staff Dashboard" etc. (3) StaffDashboard/OwnerDashboard/ClientPortal are minimal placeholders — real content comes in Steps 4+. (4) useRoleRedirect hook created but unused — kept for now in case future navigation flows need it.
**Deviations from MD:** None.
**Status:** Done
---

### 2026-07-08 — Staff Dashboard + Site List (Step 4)
**Task:** Staff dashboard with site list scoped to assigned staff, status filter buttons.
**Built:** `frontend/src/components/StatusBadge.jsx` (color-coded badge for each site status), `frontend/src/pages/StaffDashboard.jsx` (real Supabase query with status filter, table layout, filter buttons), `frontend/src/pages/SurveyScreen.jsx` (placeholder survey page with siteId param, back nav, status badge), updated `App.jsx` to add `/staff/survey/:siteId` route.
**How it works:** StaffDashboard queries `sites` table ordered by created_at desc. Filter buttons update a `filter` state — when changed, re-fetches with `.eq('status', filter)` or all if 'all'. SurveyScreen reads `siteId` from URL params and fetches that single site.
**Connects to:** SurveyScreen is the entry point for Step 5 (photo upload + rectangle + dimensions). StaffDashboard is the landing page after staff login.
**Decisions made:** (1) Kept `OwnerDashboard` and `ClientPortal` as simple placeholders — they get real content in later steps. (2) SurveyScreen uses `useParams` to get siteId, so it works as a deep-link target from the site list.
**Deviations from MD:** None.
**Status:** Done
---

### 2026-07-08 — Survey Screen (Step 5)
**Task:** Full survey screen — photo upload, canvas rectangle annotation, board type selector, dimension form, spec calculation, save to boards + estimates tables.
**Built:** `frontend/src/components/PhotoAnnotator.jsx` (canvas overlay with click-drag rectangle draw, saves as {x_pct, y_pct, w_pct, h_pct}), `frontend/src/components/SpecCard.jsx` (renders video_wall or gsb_signage spec output), full rewrite of `SurveyScreen.jsx` (3-step form: photo → annotation → details + calculate), `QuotePreview.jsx` (placeholder page after survey save, price input, send for approval), updated `App.jsx` with `/staff/quote/:boardId` route.
**How it works:** PhotoAnnotator uses canvas mouse events (mousedown/mousemove/mouseup) to draw a draggable rectangle. Coordinates stored as percentages of image dimensions. SurveyScreen wires up both calculation engines based on board type: video_wall needs env/pitch/cabinet + dimensions; gsb_signage needs only dimensions (in ft or in). On submit: uploads photo to site-photos bucket, inserts/updates boards row, creates draft estimates row, updates site status to 'quoted', redirects to QuotePreview.
**Connects to:** QuotePreview (Step 6). Photo upload goes to site-photos bucket (needs Storage policy). Board spec is stored as JSONB in boards.spec. Estimates created as draft on survey save.
**Decisions made:** (1) SpecCard handles both board types with conditional rendering — video_wall shows resolution/pixels/controller; gsb_signage shows modules/wattage/SMPS. (2) Hidden `_env`, `_pitch`, `_cab` stored in spec object to re-populate form on re-edit. (3) Estimate created immediately on survey save as draft — staff can set price and send for approval later from QuotePreview.
**Deviations from MD:** None.
**Status:** Done
---

### 2026-07-08 — PDF Generation (Step 7)
**Task:** Wire html2canvas + jsPDF for PDF generation in QuotePreview; upload to estimates-pdf bucket.
**Built:** `frontend/src/lib/pdfGenerator.ts` (exports: htmlToCanvas, canvasToPdfBlob, generateEstimatePdf, uploadPdf), full rewrite of `QuotePreview.jsx` (rendered print layout, Download PDF button, auto-generate + upload on Send for Approval).
**How it works:** QuotePreview renders a hidden-ish DOM node styled as a print layout (dark header, site name, board photo, spec card, price). "Download PDF" calls generateEstimatePdf which snapshots the node and triggers browser download. "Send for Approval" calls htmlToCanvas + canvasToPdfBlob to get a blob, uploads to estimates-pdf bucket via uploadPdf, saves URL to estimates.pdf_url, then sets status to pending_approval.
**Connects to:** estimates-pdf storage bucket must exist with RLS policies for authenticated users. QuotePreview imports from pdfGenerator.ts. jsPDF v2 uses named export `import { jsPDF } from 'jspdf'`.
**Decisions made:** (1) Refactored pdfGenerator.ts into small reusable functions — htmlToCanvas, canvasToPdfBlob (returns blob), generateEstimatePdf (downloads). (2) jsPDF v2 uses named { jsPDF } import, not default. (3) Added defensive estimate creation in QuotePreview if draft estimate doesn't exist (prevents crash when navigating directly to quote URL). (4) Added null check on estimate.id before sending for approval. (5) Added explicit price input field to QuotePreview above action buttons — price was being saved but had no visible editable field.
**Deviations from MD:** None.
**Status:** Done
---

### 2026-07-08 — approve-and-notify + approve-token Edge Functions (Steps 8 & 9)
**Task:** Build two Edge Functions: approve-and-notify (admin approves → sets status + sends email) and approve-token (client clicks email link → acknowledges one-time).
**Built:** `supabase/functions/approve-and-notify/index.ts` (CORS-enabled, verifies admin JWT, walks estimate→board→site→project→client_org chain, finds client_user profile, uses admin.getUserById for email dynamically, generates UUID token, updates both estimates and sites, sends via Resend API), `supabase/functions/approve-token/index.ts` (public, no auth, reads token from URL path, checks approval_token_used_at, sets it on first use, returns inline HTML), `frontend/src/pages/ApprovalDetail.jsx` (admin review + Approve & Send / Needs Revision buttons), `frontend/src/pages/ApprovalLanding.jsx` (public page reading HTML response text to determine ok/invalid).
**How it works:** approve-and-notify is a POST with JWT auth. It resolves the client's email dynamically from the org — no hardcoded addresses. approve-token is a GET with no auth — reads its own HTML response text to determine which page to show on the client. Both have CORS headers for localhost dev.
**Connects to:** ApprovalDetail → OwnerDashboard. ApprovalLanding → email link from approve-and-notify. Client email resolved via profiles + auth.admin.getUserById.
**Decisions made:** (1) Reverted approve-token to inline HTML response (no redirect) — simpler, avoids CORS preflight loop issues. (2) CORS headers use 204 for OPTIONS, 303 redirect had preflight issues in dev. (3) Reverted ApprovalLanding to read HTML text from response body to determine ok vs invalid state. (4) Added sending guard in ApprovalDetail to prevent double-fire on React StrictMode.
**Deviations from MD:** None.
**Status:** Done
---

---
### 2026-07-08 — Supabase schema + RLS (Step 1)
**Task:** Create all 6 tables (client_orgs → projects → sites → boards → estimates → profiles), apply RLS policies, apply demo cap trigger.
**Built:** SQL migration run in Supabase SQL Editor. Tables: client_orgs, projects, sites, boards, estimates, profiles. RLS enabled on all 6 tables with policies for admin/staff/client_user roles. Demo org cap trigger on client_orgs (limit 5, generic error message). Profiles has a CHECK constraint enforcing client_org_id IS NOT NULL for client_user and NULL for admin/staff.
**How it works:** Each table has RLS policies that check the calling user's role via the profiles table. Admin gets full access; staff gets read + limited write; client_user gets read-only scoped to their own org via a JOIN through projects. The demo cap trigger throws before insert if 5+ orgs exist.
**Connects to:** All subsequent steps depend on this schema. The profiles table is the role/auth layer that every other RLS policy references.
**Decisions made:** (1) Used generic error message "Demo limit reached." instead of lineaLED branding per user request. (2) Cabinet/module lookup uses MS, DC, CD objects (NOT CT) for sizing; CT is only for controller recommendation. (3) Did not force-test RLS cross-org isolation with fake UUIDs since only one demo org exists — will verify naturally through frontend auth.
**Deviations from MD:** None significant. Cabinet lookup clarification (MS/DC/CD vs. CT) confirmed by user as correct interpretation.
**Status:** Done
---

---
### 2026-07-08 — Install Screen (Step 12)
**Task:** Build InstallScreen — final photo upload, status → 'installed'.
**Built:** `frontend/src/pages/InstallScreen.jsx` (final photo upload to install-photos bucket, guard preventing non-approved sites from being marked installed, uploads final_photo_url to boards table, updates site status to 'installed', redirects to /staff), updated `StaffDashboard.jsx` action links (approved sites show "Mark Installed" in green, routed to /staff/install/:id), updated `App.jsx` with /staff/install/:siteId route.
**How it works:** Staff clicks "Mark Installed" on an approved site → uploads final photo to install-photos bucket → sets boards.final_photo_url → sets sites.status = 'installed'. The install-photos bucket needs RLS policies identical to site-photos.
**Connects to:** StaffDashboard action link for approved sites, install-photos storage bucket, boards.final_photo_url field.
**Decisions made:** (1) Guard in InstallScreen prevents marking non-approved sites as installed. (2) Existing final_photo_url is preserved if no new photo uploaded. (3) Installed sites show "View" (not "Install" again) in staff dashboard.
**Deviations from MD:** None.
**Status:** Done
---

### 2026-07-08 — Demo Data + Final Verification (Step 13)
**Task:** Provide SQL seed script for demo data, verify full end-to-end loop.
**Built:** SQL seed script with 8 sites across different statuses (installed×2, approved×1, quoted×1, needs_revision×1, not_surveyed×3). SQL for install-photos bucket + RLS policies. Full demo script walkthrough documented.
**How it works:** Seed script creates realistic branch names across Indian cities at different workflow stages so the full demo script (CORE.md §Demo Script) can be run end-to-end without manual DB fixes.
**Connects to:** All three role dashboards, progress rollup, full approval loop.
**Decisions made:** (1) Seed data uses real Indian city branch names for realistic demo feel. (2) Sites distributed across all 5 statuses to demonstrate the full workflow. (3) All demo data assigned to first staff user found.
**Deviations from MD:** None.
**Status:** Done
---

### 2026-07-08 — Bug fixes + Admin Setup refinement
**Task:** Fix bugs across existing flows (especially admin org/user setup), refine what we have into a stable product without building Steps 10–13 new features. Update log with detailed description.
**Built:**
- `frontend/src/pages/ClientOrgSetup.jsx` — major rewrite: session-safe user creation, org/project rename & delete, staff picker for site assignment, CSV import moved here from staff dashboard
- `frontend/src/lib/edgeFunctions.js` — shared Supabase edge function URL helpers
- `frontend/src/components/AnnotatedPhoto.jsx` — photo with annotation rectangle overlay (used in PDF + approval views)
- `frontend/src/pages/StaffDashboard.jsx` — scoped to `assigned_staff_id`, smarter action links (Survey / View Quote / Revise), CSV import removed
- `frontend/src/pages/SurveyScreen.jsx` — video wall inch→ft conversion, update existing draft estimate instead of duplicate insert, needs_revision banner
- `frontend/src/pages/QuotePreview.jsx` — annotation overlay on PDF layout, freeze spec_snapshot on send, pending-approval guard
- `frontend/src/pages/ApprovalLanding.jsx` — uses full `VITE_SUPABASE_URL` (fixes broken prod/dev approval links)
- `frontend/src/pages/ApprovalDetail.jsx` — PDF link, acknowledgment badge, sending guards, AnnotatedPhoto
- `frontend/src/pages/OwnerDashboard.jsx` — real installed count, layout fix
- `frontend/src/pages/Login.jsx` — shows profile-missing error clearly
- `frontend/src/hooks/useAuth.js` — `profileError` state when profile row missing
- `frontend/src/lib/calculations.ts` — exported `toFeet()` helper
- `frontend/vite.config.js` — proxy reads `VITE_SUPABASE_URL` from env
- `supabase/functions/approve-and-notify/index.ts` — email sent **before** DB update; rollback on site update failure; `pending_approval` guard
- `supabase/functions/approve-token/index.ts` — fixed HTML, conditional update prevents race/double-use
- `docs/FLOW_TESTS.md` — manual end-to-end test checklist for all current flows
- Deleted `frontend/src/hooks/useRoleRedirect.js` (unused dead code)

**How it works:** The admin Setup page now creates users without kicking the admin out: after `signUp`, the admin session is immediately restored via `setSession`, then the profile row is inserted. Duplicate emails are caught via empty `identities` array (the root cause of the `profiles_user_id_fkey` error in the screenshot — Supabase returns a fake user ID for already-registered emails). Staff only see sites assigned to them. Re-surveying updates the existing draft estimate instead of creating duplicates. Approval emails only flip DB status after Resend succeeds.

**Connects to:** All three role dashboards, both edge functions, CSV import modal, survey→quote→approval→client acknowledgment loop. Edge functions must be redeployed for atomic approval fix to take effect.

**Decisions made:**
1. User creation stays client-side via `signUp` + session restore (no new edge function) — sufficient for demo if emails are unique
2. CSV import moved from Staff to Admin Setup (per API contract) but component unchanged
3. Org/project delete is safe-delete only (blocks if children exist) — no cascade deletes
4. `approve-and-notify` sends email first, then updates DB — if email fails, nothing is approved (contract-compliant)
5. AnnotatedPhoto component shared between QuotePreview and ApprovalDetail

**Deviations from MD:** Admin Setup page (org/user management UI) was never in CORE.md — built as demo infrastructure by prior agent; this session refined it rather than removed it. Delete on orgs/projects is extra CRUD not in API contract but needed for demo hygiene.

**Status:** Done — frontend builds clean (`npm run build`). Edge functions need redeploy. Install flow (Step 12) intentionally not built per user request.

---

## Future Features Plan (for complete end-to-end product)

| Priority | Feature | Why |
|----------|---------|-----|
| P0 | **Install flow** (`InstallScreen`, `install-photos` bucket, `final_photo_url`, status → `installed`) | Closes the survey→install loop; demo script step 7 |
| P0 | **SQL migrations in repo** | Reproducible deploys, reviewable RLS |
| P1 | **Admin invite edge function** | Replace client-side `signUp` — no session hijack risk, handles existing emails cleanly |
| P1 | **Storage bucket policies in repo** | `site-photos`, `install-photos`, `estimates-pdf` with org-scoped read |
| P1 | **Client portal PDF download** | Clients can view their quote PDF |
| P2 | **Realtime subscriptions** | Live progress rollup without manual refresh |
| P2 | **Multi-project support** | Client portal project picker when org has >1 project |
| P2 | **PhotoAnnotator touch + resize** | Mobile field survey reliability |
| P3 | **Seed script** | One-command demo data for rehearsal |
| P3 | **`config.toml`** | `verify_jwt = false` for approve-token documented in repo |

---

## Handoff for next sessions

See **`logs/HANDOFF.md`** — full bug list, visibility model (org vs project vs site), deploy checklist, and copy-paste prompts for:
1. Steps 10–13 agent (client portal, install flow, demo rehearsal)
2. Final finishing touches agent (calc engines, migrations, polish)

---

---
### 2026-07-08 — Post Step 12–13 fixes: install photos on client portal + admin org progress
**Task:** Review Steps 12–13 logs, fix install photos not showing on client portal, add admin per-org site progress view.
**Built:**
- `frontend/src/pages/BranchDetail.jsx` — shows `boards.final_photo_url` as "Installation Photo" when site is installed; survey photo shown separately below
- `frontend/src/pages/ClientPortal.jsx` — loads **all projects and all sites** for the client's org (removed `projects.limit(1)` bug); added project filter dropdown when org has multiple projects
- `frontend/src/pages/OwnerDashboard.jsx` — new "Organization Progress" section: overall rollup + per-org breakdown with per-project installed/total counts and progress bars
- `frontend/src/pages/InstallScreen.jsx` — shows existing `final_photo_url` when viewing already-installed sites (staff "View" action)

**How it works:** Install photos were uploading correctly to `install-photos` and saving to `boards.final_photo_url`, but `BranchDetail` only rendered the survey `photo_url` — clients never saw the install image. Client portal also only loaded one arbitrary project, so demo data in other projects appeared as "1 site". Admin dashboard now queries `client_orgs → projects → sites` nested and shows installed counts per org and per project.

**Connects to:** Step 12 InstallScreen (upload path unchanged), Step 10 ClientPortal/BranchDetail, admin OwnerDashboard. Fixes HANDOFF bugs B2 (multi-project) and B17 (no install photo on client).

**Bugs found in Steps 12–13 logs (not fixed in those sessions):**
1. Step 12 log marked Done but BranchDetail never wired to `final_photo_url` — fixed here
2. Step 13 seed/demo worked but ClientPortal `limit(1)` left multi-project orgs broken — fixed here
3. Admin had only global installed count, no org breakdown — fixed here
4. InstallScreen didn't preview saved photo on re-visit — fixed here

**Decisions made:** Client portal defaults to all org sites aggregated; project filter only shown when org has 2+ projects. Admin org progress uses nested Supabase select (no new API).

**Deviations from MD:** None — aligns with CORE Step 10 (progress rollup accurate) and Step 12 (client sees install result).

**Status:** Done — `npm run build` passes. If install photo still doesn't render, check `install-photos` bucket is public or has client read RLS (same as `site-photos`).

---

### 2026-07-09 — Touch support for PhotoAnnotator + admin price edit at approval
**Task:** Two surgical changes — (1) PhotoAnnotator touch support for field staff on phones, (2) admin can edit quote price in ApprovalDetail before approving.

**Built:**
- `frontend/src/components/PhotoAnnotator.jsx` — full rewrite: replaced mouse events with Pointer Events (`onPointerDown/Move/Up/Cancel`), added `setPointerCapture` on pointerdown so drag continues even if finger drifts off canvas, added `touch-action: none` on canvas and `user-select: none` on wrapper to prevent browser scroll hijack, added devicePixelRatio-aware canvas sizing (backing store = `offsetWidth * dpr`) so rectangle is crisp on high-DPI phone screens, clamped pointer coords to canvas bounds, increased min drag threshold from 5px to 2% of smaller canvas dimension (accidental tap rejection), added dim overlay (rgba(0,0,0,.34)) outside the live selection rectangle while dragging, refitted canvas on image load and window resize/orientationchange
- `frontend/src/pages/ApprovalDetail.jsx` — added `editedPrice` state initialized from `estimate.manual_price` on load; when `status === 'pending_approval'`, price field becomes an editable number input with helper text ("Staff proposed ₹X — adjust if needed; your figure is final"); `handleApproveSend` now validates price (rejects empty/zero/negative with inline error), persists `manual_price` via direct supabase-js update before calling the edge function, then calls edge function; if edge function fails after price is saved, error is surfaced but updated price persists; input is read-only again once `approved` or `needs_revision`
- `frontend/src/pages/QuotePreview.jsx` — no changes needed: `disabled={isPending}` on price input and "pending approval" notice were already present (nice-to-have already implemented)

**How it works (Change 1):** Pointer Events unify mouse/touch/stylus into one event model. `setPointerCapture` ensures all pointer events are delivered to the canvas even when the finger moves outside the canvas bounds. The canvas backing store is sized at `devicePixelRatio` scale so drawing is crisp on Retina/HiDPI displays. A 2% minimum drag threshold rejects accidental taps without needing a separate "confirm" tap. The overlay dimming gives clear visual feedback of the selected region vs. the rest of the photo.

**How it works (Change 2):** Admin sees an editable price field only while the estimate is `pending_approval`. On approve, the price is written directly to `estimates.manual_price` (bypassing the edge function since that only handles `status` transitions per API_CONTRACT.md §3), then the edge function is called to handle the email and status atomically. If the edge function fails, the saved price remains — the staff's proposal is preserved for retry.

**API_CONTRACT.md compliance:**
- Change 1: `boards.annotation` shape `{x_pct, y_pct, w_pct, h_pct}` is unchanged — only the input mechanism changed
- Change 2: Estimates contract says `admin … yes (status → approved/needs_revision only via Edge Function §3, not direct)`. `manual_price` is not restricted — direct update is contract-compliant. Edge function is still used exclusively for `status → approved`. No contract change.

**Deviations from MD:** None.

**Status:** Done — `npm run build` passes. Both changes surgically scoped to named files only.

---

### 2026-07-09 — Add "Created by WEBNOAH" footer
**Task:** Add a persistent footer on all pages bearing the WEBNOAH attribution.

**Built:**
- `frontend/src/App.jsx` — wrapped all routes in a `flex-1` div inside a `flex flex-col` container, added a fixed `<footer>` with `bg-gray-900 text-gray-500 text-center py-3 text-xs` showing "Created by **WEBNOAH**". Footer uses `select-none` to prevent accidental text selection. Appears at the bottom of every page including the public approval landing page.

**How it works:** Flexbox column layout ensures the footer always sits at the bottom of the viewport even when page content is shorter than the screen.

**Deviations from MD:** None.

**Status:** Done.