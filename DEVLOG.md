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