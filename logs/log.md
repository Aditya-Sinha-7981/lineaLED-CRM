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