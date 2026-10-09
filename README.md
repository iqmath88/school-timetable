# School Timetable v0.9.8.2 — Unified Print Layout

- Unified stage print preview and PDF print styles via the same `printCSS()` and `printDocument()` functions.
- Stage tables fill the available A3 landscape printable width rather than using the old fixed pixel width.
- Improved subject and teacher text sizing and formal print header/footer.
- Existing timetable data, constraints and generator worker are unchanged.
- PNG export still uses the existing canvas renderer and may differ from PDF; this release does not claim pixel-perfect PNG/PDF parity.
- Back up your JSON data before deploying. Upload all five root files to GitHub Pages.
