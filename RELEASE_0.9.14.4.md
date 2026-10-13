# Masar v0.9.14.4 — Counterfactual diagnosis (experimental)

- Tests alternative full-day teacher unavailability swaps for teachers involved in detected capacity failures.
- Uses separate workers and cloned school data, does not change actual constraints.
- Ranks alternatives that pass necessary capacity checks, exports scenario report.
- **Passing necessary capacity checks is not proof of a complete 680-lesson schedule.**
- No automatic edits, no claim of full solver success.
