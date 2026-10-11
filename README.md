# School Timetable v0.9.11.3 — Generation safeguards

- Removed a teacher-name-specific early rejection that could block generation without a general proof.
- Repetition of the same assignment on one day is permitted up to the minimum mathematically required by the teacher/section available days; simultaneous teacher/section lessons remain forbidden.
- Existing user timetable is reused only after validation; bundled historical schedule is no longer silently injected.
- Added preflight validation of fixed lessons against teacher and advanced restrictions.
- Extended search deadline to 240 seconds and UI watchdog to 255 seconds; results are not guaranteed for globally infeasible or very constrained datasets.
- Existing saved timetable is retained on failed/cancelled generation. No database migrations.

**Source baseline:** v0.9.11.1, the latest complete application ZIP available for editing. The uploaded v0.9.12.4 file is a data backup, not application source. Features introduced after v0.9.11.1 are therefore not included in this release. Back up your current GitHub files before deploying this version.
