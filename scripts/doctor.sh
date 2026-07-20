#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/utils.sh"
require_repo_root

echo "🏥 World Cup Doctor"

bash scripts/check.sh

info "Running production build..."
npm run build
ok "Build passed"

app_lines=$(wc -l < src/App.jsx | tr -d ' ')
if [[ "$app_lines" -gt 8000 ]]; then
  warn "src/App.jsx is ${app_lines} lines. Next safe refactor target: extract My World Cup/Home components."
else
  ok "src/App.jsx size: ${app_lines} lines"
fi

if [[ -f api/scorers.js ]]; then
  warn "api/scorers.js still exists. Recommended future consolidation: matchevents?action=scorers. Do not delete until tested."
fi

ok "Doctor complete"
