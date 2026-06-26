# Version

## 3.0.0 — The Foundation

**Release date:** 2026-06-25

This release marks the app as a structured product rather than a prototype.

### Highlights

- Professional documentation structure under `docs/`
- GitHub project documentation, decisions, troubleshooting, and versioning notes
- Fantasy mode expanded beyond the group stage
- Actual Bracket and Fantasy knockout behavior documented
- Tournament statistics improvements
- Historical continuity handling for split-country records
- Live score architecture documented with serverless/caching strategy
- Version metadata moved to `public/version.json` for UI display

### Version source of truth

The app reads `public/version.json` at runtime and displays the version in the account modal.

The root `VERSION` file mirrors the current release number for quick repository reference.
