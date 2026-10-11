# v0.9.13.1 — PNG export visual correction
- Confirmed root cause: PNG uses a separate Canvas drawing pipeline, while PDF uses HTML/CSS print layout.
- Updated PNG with navy title bar, gold divider, matching navy column headers, light ivory notes panel.
- Scheduling logic and saved data format unchanged.
- Important: pixel-identical PNG/PDF export is not guaranteed, because separate renderers remain in use.
- Run an end-to-end browser export test on the target device before production deployment.
