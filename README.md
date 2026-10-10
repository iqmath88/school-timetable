# School Timetable v0.9.9.0 — print pagination fix

- Reduced print-only row heights, header and footer spacing to avoid splitting the school timetable over four pages.
- Retained grouped grade headings, teacher cards, color/BW printing, and scheduling data logic.
- Print settings: A3 landscape, margins minimal, scale 100%, disable browser headers/footers.
- Safari may override CSS paper size: choose A3 landscape explicitly in print dialog.
- Always export a JSON backup before replacing app files.
- PDF output on the target iPad Safari has not been verified.
