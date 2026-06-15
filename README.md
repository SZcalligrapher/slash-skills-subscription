# Slash Skills Subscription

Slash Skills Subscription is a cross-agent skill collection. The repository keeps the core skill content platform-neutral, then exposes installable adapters for Codex, Claude-style plugin layouts, and Cursor rules.

## MVP Contents

- `slash-design`: design, visual systems, and HTML slide decks.
  - Includes `frontend-slides`.
- `slash-media`: creator publishing workflows for social cards and cover systems.
  - Includes `guizang-social-card-skill`.

## Repository Layout

```text
skills/             Source-of-truth skill content, grouped by product line.
plugins/            Installable plugin packages generated from skills/.
adapters/cursor/    Cursor rule adapters and setup material.
marketplace.json    Codex marketplace entry point.
scripts/            Maintenance helpers.
```

## Install In Codex

From a published GitHub repository:

```bash
codex plugin marketplace add yourname/slash-skills-subscription --ref main
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

For local MVP testing:

```bash
codex plugin marketplace add /path/to/slash-skills-subscription
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

## Update In Codex

After new commits are pushed to GitHub:

```bash
codex plugin marketplace upgrade slash-skills
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

Start a new thread after reinstalling so the updated skills are loaded.

## Cursor Adapter

Cursor does not use the same plugin marketplace flow. For the MVP, copy the rule files and the matching source skills into a project:

```text
.cursor/rules/slash-design.mdc
.cursor/rules/slash-media.mdc
.cursor/slash-skills/design/frontend-slides/
.cursor/slash-skills/media/guizang-social-card-skill/
```

The Cursor rules point the agent at the local skill instructions.

## Maintaining Plugin Packages

Edit the source skills under `skills/`, then sync the installable plugin copies:

```bash
bash scripts/sync-plugin-skills.sh
```

Commit both the source skill updates and the generated plugin package copies.
