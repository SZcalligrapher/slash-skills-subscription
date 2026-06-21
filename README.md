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

## Verify The Subscription

Run the built-in repository checks:

```bash
npm run validate
```

The validator checks:

- `marketplace.json` has the required marketplace and plugin fields.
- Every marketplace plugin points to an existing package under `plugins/`.
- Codex and Claude manifests exist for each pack.
- Source skills under `skills/` have `name` and `description` frontmatter.
- Generated plugin skill copies are synced with their source skills.

For an end-to-end Codex smoke test, install the GitHub marketplace into a clean Codex profile or a fresh machine:

```bash
codex plugin marketplace add SZcalligrapher/slash-skills-subscription --ref main
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
```

Then start a new Codex thread and ask for a skill by name, for example:

```text
Use $frontend-slides to create a 5-page presentation about my product launch.
```

```text
Use $guizang-social-card-skill to turn this article into Xiaohongshu carousel images.
```

## Local Web Admin

This repo includes a lightweight local management window for editing and validating the subscription:

```bash
npm run admin
```

Open:

```text
http://127.0.0.1:8787
```

The admin window can:

- View all source skills and installable packs.
- Edit source `SKILL.md` files.
- Edit pack metadata for Codex and Claude manifests.
- Save and sync source skills into `plugins/`.
- Run the same validation checks used by `npm run validate`.

This tool writes local repository files, so keep it on `127.0.0.1` and use it as a private maintenance interface.

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
