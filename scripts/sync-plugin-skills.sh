#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sync_skill() {
  local src="$1"
  local dest="$2"

  mkdir -p "$(dirname "$dest")"
  rsync -a --delete --exclude .git "$src/" "$dest/"
}

sync_skill "$ROOT/skills/design/frontend-slides" "$ROOT/plugins/slash-design/skills/frontend-slides"
sync_skill "$ROOT/skills/media/guizang-social-card-skill" "$ROOT/plugins/slash-media/skills/guizang-social-card-skill"

echo "Synced Slash source skills into plugin packages."
