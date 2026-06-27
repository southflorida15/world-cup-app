#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/utils.sh"
require_repo_root

msg=${1:-}
[[ -n "$msg" ]] || fail "Usage: npm run release -- \"commit message\""

bash scripts/doctor.sh

info "Git status before release:"
git status --short
read -r -p "Continue with git add/commit/push? (y/N) " answer
[[ "$answer" == "y" || "$answer" == "Y" ]] || fail "Release cancelled"

git add -A
git commit -m "$msg"
git push origin main
ok "Release pushed to origin/main"
