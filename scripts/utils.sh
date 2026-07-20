#!/usr/bin/env bash
set -euo pipefail

wc_blue='\033[0;34m'
wc_green='\033[0;32m'
wc_yellow='\033[1;33m'
wc_red='\033[0;31m'
wc_reset='\033[0m'

info(){ echo -e "${wc_blue}ℹ${wc_reset} $*"; }
ok(){ echo -e "${wc_green}✓${wc_reset} $*"; }
warn(){ echo -e "${wc_yellow}⚠${wc_reset} $*"; }
fail(){ echo -e "${wc_red}✗${wc_reset} $*"; exit 1; }

require_repo_root(){
  [[ -f package.json && -d src && -d api ]] || fail "Run this from the world-cup-app repository root."
}

read_version(){
  node -e "const v=require('./public/version.json'); console.log((v.appVersion||v.version||'unknown')+'|'+(v.refreshVersion||'unknown')+'|'+(v.releaseName||''));" 2>/dev/null || echo "unknown|unknown|"
}
