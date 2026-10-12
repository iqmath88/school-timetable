# Masar v0.9.13.4 — Teacher-time feasibility diagnostics

- Added exact maximum-flow necessary-condition check per teacher, accounting for shared time slots across assignments, daily teaching limits, stage daily capacity, unavailable periods, hard advanced restrictions, and hard subject first/last exclusions.
- Returns `teacher-time-flow` with teacher IDs, missing slot count and relevant assignments if impossible.
- Does not relax teacher restrictions or modify school data.
- Timeout polling every 32 nodes.

**Scope:** Diagnostic and pruning improvement, not a replacement with CP-SAT and not a demonstrated complete solution to the constrained 680-period instance.
