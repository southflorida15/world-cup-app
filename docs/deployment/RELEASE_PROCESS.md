# Release Process

Use this process for normal releases.

1. Apply the patch or finish local edits.
2. Run `npm run doctor`.
3. Verify the app locally with `npm run dev`.
4. Commit and push:
   ```bash
   git add -A
   git commit -m "your message"
   git push origin main
   ```
5. Verify the Vercel deployment.

## Forced refresh

`public/version.json` controls user refresh behavior.

- `appVersion`: visible release number.
- `refreshVersion`: bump this only when users should be forced to refresh.
- `forceRefresh`: keep `true` when refreshVersion should trigger the branded reload.

For minor docs/tooling changes, do not bump `refreshVersion`.
