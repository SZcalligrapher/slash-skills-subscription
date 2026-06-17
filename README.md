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

Add the Slash Skills marketplace from GitHub:

```bash
codex plugin marketplace add SZcalligrapher/slash-skills-subscription --ref main
```

Then install the skill packs you want:

```bash
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

You can install only one pack if that is all you need:

```bash
codex plugin add slash-design@slash-skills
```

```bash
codex plugin add slash-media@slash-skills
```

After installing, start a new Codex thread so the newly installed skills are loaded into context.

For local MVP testing:

```bash
codex plugin marketplace add /path/to/slash-skills-subscription
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

## Update In Codex

After new commits are pushed to GitHub, refresh the marketplace snapshot:

```bash
codex plugin marketplace upgrade slash-skills
```

Then reinstall the packs you use:

```bash
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

Start a new Codex thread after reinstalling so the updated skills are loaded.

To refresh every Git marketplace configured in Codex, omit the marketplace name:

```bash
codex plugin marketplace upgrade
```

## Available Codex Packs

### `slash-design`

Design, visual systems, presentation craft, and HTML slide decks.

Install:

```bash
codex plugin add slash-design@slash-skills
```

Included skills:

- `frontend-slides`

### `slash-media`

Creator publishing workflows for social cards, Xiaohongshu/Rednote image sets, WeChat covers, and article thumbnails.

Install:

```bash
codex plugin add slash-media@slash-skills
```

Included skills:

- `guizang-social-card-skill`

## Remove In Codex

Remove an installed pack:

```bash
codex plugin remove slash-design
codex plugin remove slash-media
```

Remove the marketplace source:

```bash
codex plugin marketplace remove slash-skills
```

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
