#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sync_pack() {
  local line="$1"
  local plugin="$2"
  local source_dir="$ROOT/skills/$line"
  local plugin_dir="$ROOT/plugins/$plugin/skills"

  mkdir -p "$plugin_dir"
  if [[ -d "$source_dir" ]]; then
    rsync -a --delete --exclude .git "$source_dir/" "$plugin_dir/"
  fi
}

sync_pack "design" "slash-design"
sync_pack "media" "slash-media"
sync_pack "marketing" "slash-marketing"
sync_pack "product" "slash-product"

echo "Synced Slash source skills into plugin packages."
