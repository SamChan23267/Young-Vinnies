4th August 2026
**What:** Initialized fresh repository structure, configured GitHub Kanban/Roadmap boards, defined project labels, and logged Issue #1 regarding manual Google Sheets tracking pain points.
**Why:** Establishing a structured development process early to collect authentic evidence for the Scholarship report.
**Next:** Begin Phase 3 on `feature/core-member-session-tracking` to build Express scaffolding and member/session JSON models.

5th August 2026
**What:** Set up a minimal Express server, `package.json`, `.gitignore`, a placeholder `index.html`, and an empty `data.json` structure (`{ members: [], sessions: [] }`).
**Why:** Wanted a bare, runnable foundation before adding any real functionality, rather than bundling the whole app into one commit like the previous repo did.
**Next:** Build member management so students can be added and listed — the first direct replacement for manual Google Sheets entry.

5th August 2026
**What:** Implemented `GET`/`POST /api/members` endpoints, a `generateMemberCode` helper for auto-generating unique member codes, and a minimal frontend form and table for adding and viewing members.
**Why:** This is the core feature that replaces manually typing student names into the Google Sheet — the original pain point behind the whole project.
**Next:** Add session creation and listing so service sessions can be recorded alongside members.

5th August 2026
**What:** Added `GET`/`POST /api/sessions` endpoints, a `generateSessionId` helper, and a frontend form/list for creating and viewing sessions.
**Why:** Members alone don't solve the tracking problem — sessions need to exist as records before attendance (and therefore hours) can be tracked against them.
**Next:** Build attendance tracking so each session records which members actually attended.

5th August 2026
**What:** Added `GET /api/sessions/:id` and `PUT /api/sessions/:id/attendance` endpoints, a new `session.html` page, and frontend logic to mark and save attendance per session.
**Why:** This is the feature that actually eliminates the manual hour-counting problem from the old spreadsheet workflow — attendance data now drives hour totals automatically instead of manual tallying.
**Next:** Add audit logging so every data change is tracked and recoverable.

5th August 2026
**What:** Added `audit_log.json` and a `logAudit` helper, called from the member creation, session creation, and attendance update endpoints.
**Why:** Wanted a reliable record of who changed what and when, in case of disputes or mistakes in recorded hours — especially important once other leaders start using the system.
**Next:** Add CSV export in the format requested at the St Vincent de Paul meeting.

6th August 2026
**What:** Added a `GET /api/export/csv` endpoint and a frontend export button to download all session attendance data as a CSV file.
**Why:** Directly requested at our first meeting with the wider St Vincent de Paul Society — they needed a roll and return export in a specific format broken down by section and member.
**Next:** Polish the UI with a proper visual design so the tool is presentable to other leaders and to SVdP.

7th August 2026
**What:** Replaced the minimal styling with a full CSS theme (gradient header, card-based sections, responsive breakpoints) and updated the HTML markup to match.
**Why:** The functional version worked but wasn't presentable — wanted something I could confidently demo to other leaders and to SVdP without it looking unfinished.
**Next:** Write full project documentation.

9th August 2026
**What:** Added session-based login using `express-session`, a `requireAuth` middleware protecting all data routes, and login/logout/check-auth endpoints. Passwords are hashed with bcrypt and compared securely; the session secret and credentials are loaded from a `.env` file rather than hardcoded in source.
**Why:** After testing the app myself, realised other leaders and teachers would benefit from having direct access rather than relying solely on me to update records.
**Next:** Add login page and frontend auth flow (redirect unauthenticated users, logout button).

9th August 2026
**What:** Added `login.html`, a `checkAuth()` function that redirects unauthenticated users away from protected pages, a `logout()` function, and logout buttons on `index.html` and `session.html`. Deliberately left out any display of default credentials on the login page itself.
**Why:** Needed a usable entry point for the new authentication system, and wanted to avoid a real risk I identified while preparing my Scholarship report — the original version displayed the username/password directly on the login page, which is a genuine security exposure if the site is public.
**Next:** Move remaining secrets fully into environment variables and confirm `.env` is excluded from git.
 
 9th August 2026
 **What:** Added `dotenv`, created `.env.example` documenting required variables (`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`), and moved the real values into a local `.env` file excluded by `.gitignore`.
**Why:** Hardcoding secrets in source code means anyone with repo access (or anyone finding the repo if it's ever made public) can read them directly. Hit a `"secret option required for sessions"` error initially because `.env` wasn't created yet and `dotenv.config()` needs to run before the session middleware — fixed by creating a real `.env` and confirming `require('dotenv').config()` sits at the very top of `index.js`.
**Next:** Add admin/super-admin role distinction now that multiple people can log in.

10th August 2026
**What:** Replaced the single hardcoded admin login with a multi-user system backed by `users.json`, storing bcrypt-hashed passwords and assigning each user a role (`admin` or `super_admin`). Updated the login and check-auth endpoints to return role/display name, and updated audit logging so every entry records which user made the change.
**Why:** A single shared login didn't reflect reality once other leaders and a teacher started using the app — distinguishing roles matters once more than one person can make changes, especially for anything sensitive like viewing the full audit trail. Kept passwords hashed and off the login page, consistent with the approach from Stage 11 rather than repeating the original repo's plaintext/visible-credentials pattern.
**Next:** Add an audit log viewer so a super admin can actually review who changed what.

10th August 2026
**What:** Added a `GET /api/audit-log` endpoint restricted to `super_admin` via a new `requireSuperAdmin` middleware, plus an `audit-log.html` page showing timestamped, per-user change history. The "Administrator Tools" section on the main page is now only shown to users with the `super_admin` role.
**Why:** With multiple leaders able to modify data, a super admin needs a way to review the full history of changes (who added a member, who marked attendance) without restricting day-to-day access for regular leaders — accountability without adding friction.
**Next:** Decide whether flexible CSV export formats (horizontal/vertical/summary) belong in this phase or need their own trigger and stage — currently unresolved.

18th August 2026
**What:** Split the single long `index.html` into dedicated pages (`members.html`, `sessions.html`, `export.html`) with a shared navigation bar across all pages. `index.html` is now a simple landing page rather than holding every form and table at once. Consolidated the per-page auth checks (Stage 11) and role check (Stage 12) into one shared `initPage()` function used everywhere.
**Why:** With authentication, roles, and an audit log added on top of the original member/session/export sections, the main page had become long and harder to navigate — especially for other leaders less familiar with the app. Logged as a self-observed usability issue before starting this work.
**Next:** Build the actual SVdP-required roll & return export format (closes the still-open 17 March Issue) — this stage deliberately left export.html at its original single-button functionality, deferring format options to that dedicated stage.

24th August 2026
**What:** Added a `settings.html` page showing account info (username, role, display name) and a working change-password form, backed by a new `/api/change-password` endpoint. Moved the logout button out of every page's header into Settings, with a Settings link added to the shared nav so it stays one click away everywhere.
**Why:** Not requested by anyone specifically — a self-directed improvement to give the header some breathing room and give logout (and any future account preferences) a proper, consistent home rather than a floating button repeated on every page.
**Next:** Add the change-password functionality properly, as its own commit.

25th August 2026
**What:** Added a `PUT /api/change-password` endpoint requiring the correct current password (verified via bcrypt) before allowing a new one to be set, and wired up the change-password form on the Settings page. Password changes are recorded in the audit log.
**Why:** Completes the Settings page properly rather than leaving it half-built. Verifying the current password before allowing a change matters — without it, anyone with an already-open session could silently take over the account.
**Next:** Build the actual SVdP-required roll & return export format (closes the still-open 17 March Issue).

31st August 2026
**What:** Added an `hours` field to sessions (default 1, adjustable per session via the create-session form), stored and displayed alongside each session's existing date/description/attendance.
**Why:** Attendance previously just recorded who showed up, with every session implicitly worth the same amount. In practice, volunteers don't contribute equal time at a session — people arrive late, leave early, or stay back to help pack up. Logged as a self-observed data model gap before building, since it's a prerequisite for the SVdP export doing accurate hour-based reporting rather than a flat attendance count.
**Next:** Add per-member hours override — a fixed hours value per session still doesn't account for individual people arriving late or leaving early.
 
 31st August 2026
 **What:** Changed attendance from a plain list of member codes to a list of `{ code, hours }` objects, letting each attendee's hours be overridden individually rather than always inheriting the session's default. Updated the attendance form to show an editable hours input next to each checked-in member.
**Why:** A single default-hours-per-session value (previous commit) still assumed everyone present stayed the same length of time, which isn't true in practice — people arrive late, leave early, or stay back to help pack up. This was the actual gap identified in the triggering Issue, not just varying hours session-to-session.
**Next:** Build the actual SVdP-required roll & return export format, now with accurate per-member hours to draw from.

1st September 2026
**What:** Replaced the original flat CSV export with a configurable roll & return format — orientation (one row per session, or one row per member per hour worked), member display (code/name/both), date range filtering, and the ability to select specific sessions rather than exporting everything.
**Why:** Finally implements what SVdP actually asked for at the 17 March meeting — the original Stage 6 export was only ever for copy-pasting into our own Google Sheets, never the format SVdP requested. Depends on the hours field from the previous stage so the vertical export can accurately represent varying contribution per member, rather than treating every attendance as equal.
**Next:** Confirm the exported format with SVdP directly and close the 17 March Issue once confirmed — not before, since "code works" and "SVdP confirms it's right" are different things.