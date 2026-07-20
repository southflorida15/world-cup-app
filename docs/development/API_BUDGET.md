# API Budget

Current serverless API count in the baseline project: 12.

Target: 10-11 files to keep a Vercel function buffer.

## Candidate consolidation

- `api/scorers.js` can likely be retired once all UI uses `api/matchevents?action=scorers`.
- Additional consolidation should be done one endpoint at a time, with production tests after each change.

Do not delete API files during tooling-only sprints.
