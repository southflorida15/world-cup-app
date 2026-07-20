#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/utils.sh"
require_repo_root

mkdir -p backups
IFS='|' read -r app_version refresh_version release_name < <(read_version)
stamp=$(date +%Y%m%d-%H%M%S)
name="backups/world-cup-app-${app_version}-${stamp}.zip"
info "Creating backup: ${name}"
zip -qr "$name" . \
  -x "node_modules/*" "dist/*" ".git/*" ".vercel/*" "backups/*" "*.DS_Store" "__MACOSX/*"
ok "Backup created"
