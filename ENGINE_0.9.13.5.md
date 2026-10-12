# v0.9.13.5 — Availability-aware engine experiment

- Improved selection of daily section quotas: avoid removing a time slot scarce for assigned teachers.
- Added varied deterministic quota attempts to avoid repeating nearly identical daily layouts.
- Aligned repeat-necessity validation with hard advanced availability rules.
- Added lastValidationReason to failure diagnostics.
- This is an experimental improvement to the existing browser-based DFS engine, **not CP-SAT**.
- A completed timetable under all original constraints is not yet established by these changes.
