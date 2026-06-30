# Slash Skills Subscription

Slash Skills Subscription is a cross-agent skill collection. The repository keeps the core skill content platform-neutral, then exposes installable adapters for Codex, Claude-style plugin layouts, and Cursor rules.

## MVP Contents

- `slash-design`: design, visual systems, animation review, and HTML slide decks.
  - Includes `frontend-slides`, `emil-design-eng`, and `review-animations`.
- `slash-media`: creator publishing workflows for social cards, cover systems, article illustrations, and Chinese creator content production.
  - Includes `guizang-social-card-skill`, `ian-xiaohei-illustrations`, and the `li-skills` creator toolkit.
- `slash-marketing`: product marketing, growth, SEO, CRO, ads, lifecycle, and go-to-market workflows.
  - Includes the Marketing Skills collection.
- `slash-product`: product packaging, App Store screenshots, launch assets, and app presentation workflows.
  - Includes `aso-appstore-screenshots`.

## Repository Layout

```text
skills/             Source-of-truth skill content, grouped by product line.
plugins/            Installable plugin packages generated from skills/.
adapters/cursor/    Cursor rule adapters and setup material.
marketplace.json    Codex marketplace entry point.
scripts/            Maintenance helpers.
THIRD_PARTY_NOTICES.md
                    Source and license notes for redistributed skills.
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
codex plugin add slash-marketing@slash-skills
codex plugin add slash-product@slash-skills
```

You can install only one pack if that is all you need:

```bash
codex plugin add slash-design@slash-skills
```

```bash
codex plugin add slash-media@slash-skills
```

```bash
codex plugin add slash-marketing@slash-skills
```

```bash
codex plugin add slash-product@slash-skills
```

After installing, start a new Codex thread so the newly installed skills are loaded into context.

For local MVP testing:

```bash
codex plugin marketplace add /path/to/slash-skills-subscription
codex plugin add slash-design@slash-skills
codex plugin add slash-media@slash-skills
codex plugin add slash-marketing@slash-skills
codex plugin add slash-product@slash-skills
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
codex plugin add slash-marketing@slash-skills
codex plugin add slash-product@slash-skills
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
- `emil-design-eng`
- `review-animations`

### `slash-media`

Creator publishing workflows for social cards, Xiaohongshu/Rednote image sets, WeChat covers, article thumbnails, topic strategy, scripts, hooks, distribution, and content review.

Install:

```bash
codex plugin add slash-media@slash-skills
```

Included skills:

- `guizang-social-card-skill`
- `ian-xiaohei-illustrations`
- `li`
- `li-writer`
- `li-topic`
- `li-recorder`
- `li-opening`
- `li-cover`
- `li-analyzer`
- `li-distribute`
- `li-transcript`
- `li-prd`
- `li-prd-review`
- and the rest of the `li-skills` creator toolkit under `skills/media/`.

### `slash-marketing`

Product marketing, growth strategy, CRO, SEO, ads, lifecycle, pricing, launches, and go-to-market workflows.

Install:

```bash
codex plugin add slash-marketing@slash-skills
```

Included skills include:

- `product-marketing`
- `marketing-plan`
- `marketing-ideas`
- `copywriting`
- `copy-editing`
- `cro`
- `seo-audit`
- `ai-seo`
- `ads`
- `ad-creative`
- `analytics`
- `aso`
- `social`
- `emails`
- `launch`
- `pricing`
- `onboarding`
- `paywalls`
- `customer-research`
- `sales-enablement`
- `revops`
- and the rest of the Marketing Skills collection under `skills/marketing/`.

### `slash-product`

Product packaging, App Store screenshots, launch assets, and app presentation workflows.

Install:

```bash
codex plugin add slash-product@slash-skills
```

Included skills:

- `aso-appstore-screenshots`

## Remove In Codex

Remove an installed pack:

```bash
codex plugin remove slash-design
codex plugin remove slash-media
codex plugin remove slash-marketing
codex plugin remove slash-product
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
.cursor/rules/slash-marketing.mdc
.cursor/rules/slash-product.mdc
.cursor/slash-skills/design/frontend-slides/
.cursor/slash-skills/design/emil-design-eng/
.cursor/slash-skills/design/review-animations/
.cursor/slash-skills/media/guizang-social-card-skill/
.cursor/slash-skills/media/ian-xiaohei-illustrations/
.cursor/slash-skills/media/li*/
.cursor/slash-skills/marketing/
.cursor/slash-skills/product/aso-appstore-screenshots/
```

The Cursor rules point the agent at the local skill instructions.

## Maintaining Plugin Packages

Edit the source skills under `skills/`, then sync the installable plugin copies:

```bash
bash scripts/sync-plugin-skills.sh
```

Commit both the source skill updates and the generated plugin package copies.
