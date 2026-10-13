# Masar v0.9.13.8 — Service readiness and diagnostics

This release does NOT yet demonstrate a complete 680-period timetable. The remote solver requires an independently deployed Python service and OR-Tools. It does not magically work by uploading the ZIP to GitHub Pages.

## Changes
- Added Dockerfile and Render deployment blueprint for solver-service.
- Added /health endpoint with solverReady flag.
- Restricted CORS to MASAR_ALLOWED_ORIGIN (browser origin; no trailing slash).
- Bounded incoming JSON payloads and clarified error responses.
- Added provable section and teacher upper-bound capacity diagnostics before CP-SAT.
- Preserved independent candidate validation and existing timetable on failure.

## Deploy
1. Push project to GitHub repository. Create a Render web service using solver-service/Dockerfile and solver-service as Docker context, or use render.yaml blueprint.
2. Set MASAR_ALLOWED_ORIGIN to the exact browser origin (e.g. https://iqmath88.github.io).
3. Check https://YOUR-SERVICE/health and confirm solverReady=true.
4. In the app, set endpoint https://YOUR-SERVICE/solve.
5. Protect this service behind proper authentication and rate limiting before sending real student/teacher data; CORS is NOT authentication. The sample server is not production-secure.

## Limitations
- OR-Tools could not be installed in the offline build environment, so CP-SAT execution and full 680-period generation remain unverified.
- No hosted service URL is included or claimed.
- No proof that the modeled constraints fully match the browser validator yet.
