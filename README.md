# School Timetable v0.9.6.6 — Content-fit table widths

- The stage table now calculates a bounded width for each section based on actual subject and displayed teacher names.
- The total table width is the sum of the column widths, rather than filling the entire print preview or A3 page.
- The day column stays merged and vertical; the period column stays narrow.
- Preview and print use the same table widths; the full-school view can scroll horizontally.
- PNG already computes column widths from measured text and remains unchanged.
- No changes to the scheduling engine, constraints or timetable data.

Test in Safari print preview on iPad; printing output was not device-tested.
