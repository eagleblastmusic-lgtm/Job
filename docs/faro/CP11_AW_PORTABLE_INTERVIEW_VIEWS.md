# CP11-AW — Portable private interview views/calendar (2026-10-07)

SQLite and native PostgreSQL share explicit interview/list queries and original public projection. Candidate owns its process; other viewers require current active assigned membership. Native session callback executes inside owned read-only SERIALIZABLE transaction for detail/list/calendar. Projection excludes recruiter identity, candidate identity, createdAt and internal source row ID; listing retains createdAt then rowid/imported source row ID order.

Confirmed-only ICS retains existing UTC times, fixed title, no attendee/contact fields, text escaping and RFC5545 line folding measured in UTF-8 bytes. Shared collision query retains strict starts<ends/ends>starts overlap across both candidate/recruiter participant identities, so touching slots remain available. This stage converts reads/helpers; scheduling/change/worker remain SQLite for subsequent stages.

Rebuilt actual API interview calendar/DST/slot/current scope/mutual completion regression PASS1; source70/35 and syntax/diff PASS. Actual PostgreSQL18 Node22/24 rehearsal uses isolated PROPOSED/CONFIRMED interview rows to verify exact detail/list wire view, current session/member refusal, candidate continued ownership, unconfirmed calendar refusal, UTC/timezone, UTF-8 folding/escaping/private ICS, overlap and touching boundary. Synthetic rows are read fixtures, not native scheduling acceptance. Full local/remote acceptance pending.

Runtime SQLite; drafts unmerged and whole CP11/master plan/release PARTIAL. Continue atomic native interview proposal/change/tick and remaining auth/MFA/privacy/worker/recovery/operator integration and external acceptance. Locked login/CV/EHV unchanged; no provider, advanced execution or release enablement.
