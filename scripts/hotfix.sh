#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/utils.sh"
require_repo_root

msg=${1:-}
[[ -n "$msg" ]] || fail "Usage: npm run hotfix -- \"hotfix message\""

info "Running build before hotfix..."
npm run build

git add -A
git commit -m "hotfix: $msg"
git push origin main
ok "Hotfix pushed"
