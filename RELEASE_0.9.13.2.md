# Masar v0.9.13.2 — Export stability release

- Synced visible version, JavaScript version, and asset cache keys.
- PNG export now uses indexed timetable lookup, avoiding a full schedule scan per cell.
- Improved column widths for teacher and section cards.
- Fixed PNG handling of disabled stage colors and empty active days/sections.
- Kept timetable generator, worker, and stored data schema unchanged.

## Important limitation
PNG is still rendered on Canvas, while PDF uses the browser print engine. The two outputs share the premium color palette but are **not pixel-identical**. Do not describe this as a fully unified rendering engine.

## Deployment
Upload extracted files to repository root, replacing matching filenames. Keep any unrelated data and repository configuration files. Reload with cache bypass if necessary.
