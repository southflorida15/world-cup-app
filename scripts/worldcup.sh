#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/utils.sh"
require_repo_root

cat <<MENU
🏆 World Cup DevKit

1) Doctor
2) Check
3) Backup
4) Git status
5) Exit
MENU
read -r -p "Choose: " choice
case "$choice" in
  1) bash scripts/doctor.sh ;;
  2) bash scripts/check.sh ;;
  3) bash scripts/backup.sh ;;
  4) git status ;;
  *) echo "Bye" ;;
esac
