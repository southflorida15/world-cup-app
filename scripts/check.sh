#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/utils.sh"
require_repo_root

echo "🏆 World Cup App Check"

[[ -f public/version.json ]] && ok "public/version.json found" || fail "Missing public/version.json"
[[ -f package.json ]] && ok "package.json found" || fail "Missing package.json"
[[ -f src/App.jsx ]] && ok "src/App.jsx found" || fail "Missing src/App.jsx"

IFS='|' read -r app_version refresh_version release_name < <(read_version)
info "Version: ${app_version}"
info "Refresh: ${refresh_version}"
[[ -n "$release_name" ]] && info "Release: ${release_name}"

api_count=$(find api -maxdepth 1 -type f -name '*.js' | wc -l | tr -d ' ')
if [[ "$api_count" -gt 11 ]]; then
  warn "API files: ${api_count}. Target is 10-11 to keep Vercel buffer."
else
  ok "API files: ${api_count}"
fi

if [[ -d node_modules ]]; then ok "node_modules present"; else warn "node_modules missing; run npm install"; fi

ok "Check complete"
