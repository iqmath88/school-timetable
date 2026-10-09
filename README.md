# School Timetable v0.9.0 — Advanced Scheduling Preview

## Installation
Upload all five files together to the root of the GitHub Pages repository. Do not delete local browser data. Export a JSON backup before upgrading.

## New
- Stage-specific daily period counts. Set Tuesday's general limit to 7, sixth stage to 7, other stages to 6.
- Subject rules: disallow first period, last actual period, or daily repetition; choose stage and hard/soft status.
- A new Web Worker scheduling search enforces contiguous lessons from the first period for each section/day, stage capacity, teacher availability and daily limits, fixed lessons and hard subject rules.
- Distinct day header colors and stage-based lesson colors in on-screen timetable and printing.
- Updated section capacity feasibility calculation and timetable move validation.

## Limitations
- The new generator is experimental. It can fail to find a feasible timetable before its 40-second limit even when one exists.
- The daily quota search is heuristic; the absence of a solution is not proof of impossibility.
- Subject rules marked 'preferred' are not optimized by the current worker.
- Existing manually edited timetables may contain gaps; regeneration is required to apply contiguous-day constraints.
- No automatic swap/repair of existing schedules is provided yet.
