Title: Fix Update merge ordering and flag preservation

Summary
- Ensure Update merges generated TSV with existing rows by matching on Reference (ignoring "DELETED "), OrigWords, and Occurrence.
- Preserve user flags: keep "DELETED " on Reference and prefix "DONE " to Disambiguation when applicable while adopting the newly generated disambiguation text.
- Sort/insertion uses numeric chapter:verse ordering and ignores the "DELETED " prefix.

Changes
- src/utils/tsvUtils.js
  - compareReferences now ignores a leading "DELETED " and parses chapter/verse numerically.
- src/services/twlService.js
  - Matching key normalizes Reference by stripping "DELETED ".
  - Merging preserves existing "DONE " flag on Disambiguation while using updated generated text.
- src/App.jsx
  - Update flow inserts new rows using compareReferences(newRef, existingRef) <= 0 instead of string comparison.

Why
- Rows were being ordered lexically (e.g., 1:10 before 1:2) and DELETED rows were pushed to the end. Update should behave like initial Generate+Merge and preserve user markings.

Testing
- Ran node test-merge-logic.js to verify merge behavior and ordering; validated reference sorting and disambiguation handling.
- Verified compareReferences now treats "DELETED 1:1" the same as "1:1" and sorts 1:2 after 1:10 correctly.
- Local Vite dev server cannot bind in this sandbox (EPERM), but logic-level tests executed successfully.

How to Review
1) Checkout branch: `git fetch origin fix/update-merge-order && git checkout fix/update-merge-order`
2) Review core diffs in the three files above.
3) Optional: run the node scripts for quick sanity checks:
   - `node test-merge-logic.js`
   - `node test-normalize.js`

PR Notes
- No UI changes. No new dependencies. Minimal, targeted edits.
- Existing behavior remains the same except for corrected ordering and preserved flags.

