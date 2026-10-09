# School Timetable v0.9.5 — Verified Reference Schedule

- Validates all saved timetable entries, assignment loads, teacher clashes, section clashes, mandatory teacher unavailability, daily min/max, subject hard constraints, fixed lessons, and internal section gaps.
- If the current timetable passes, retains the proven feasible schedule and avoids an unnecessary expensive search. This is **reuse of a verified solution**, not a new optimization run.
- If saved schedule is missing or invalid, the existing DFS search runs with diagnostics.
- A3 landscape school print remains two pages: intermediate and preparatory.
- No automatic changes to teacher constraints.

## Installation
Upload index.html, app.js, generator-worker.js, styles.css, README.md to the repository root. Back up school data before updating. The JSON backup is not included in the public release because it contains personal teacher data.

## Limitations
The search algorithm may still time out when asked to build a fresh schedule from scratch. The reference validator provides a trustworthy baseline, not a proof of solver completeness.
