# Masar v0.9.13.6 — first CP-SAT architecture milestone

This release **includes a separate, optional CP-SAT solver prototype** in `solver-service/`.

- The existing browser generator remains unchanged and is the only generator invoked by the web UI. The CP-SAT service is **not integrated into GitHub Pages**.
- The prototype models assignments, teacher collisions and unavailability, teacher daily limits, section collisions and contiguous days, stage/day capacities, hard subject rules, advanced rules, and fixed lessons.
- CP-SAT requires Python and OR-Tools, which are **not bundled**. Run `pip install -r solver-service/requirements.txt`, then `python solver-service/solver.py backup.json 60` to test offline.
- Results are candidates only: browser validation parity, quality optimization, explainable minimal repair, security/authentication, API hosting and deployment are pending.
- `UNKNOWN`/timeout is **not proof of infeasibility**. Do not automatically relax hard constraints.
- The sample HTTP server binds only to localhost; it is not hardened or ready for internet exposure.

The archive is a development milestone, **not a verified solution** to the 680-lesson dataset.
