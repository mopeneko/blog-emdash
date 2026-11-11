# blog-emdash verification map

Use this index before driving the public blog. Each feature file is a recipe for observable user behavior, not an inventory of implementation code.

## Baseline preconditions

- Follow `../SKILL.md` to launch at `http://127.0.0.1:4331` with a run-specific `$BLOG_VERIFY_STATE` and `$AGENT_BROWSER_SESSION`.
- `seed/seed.json` has validated and dev setup has completed, including its imported media.
- The homepage contains `ブログでユーザーのプライバシーを保護する方法`; doctor reports `authMethod` `dev-bypass` for this origin.
- The on-screen site identity is `mopeneko` (header `.site-title`, footer brand, and the `site-identity.ts` fallback), and the footer shows `blog.lem0n.cc`. The seed defines no site-settings record, so these fixed strings are the baseline, not a settings failure.
- Never drive or mutate an instance not launched for this verification run.

## Driving conventions

- Prefix commands with `agent-browser --session "$AGENT_BROWSER_SESSION"`, or export that session as shown in the skill.
- Use current ARIA snapshots and stable selectors. Refs expire when a page or widget rerenders.
- All commands in feature files use the baseline `$BASE_URL`, `$RUN_DIR`, and `$EVIDENCE_DIR`.
- Capture both the user action and the resulting state. A direct route check is not proof of a link journey.
- Restore seeded data after any explicitly scoped mutation; do not remove proof artifacts.

## Proof and skip reporting

- UI proof includes an ARIA snapshot and a screenshot. Name artifacts with the feature ID and entry point.
- Read-only journeys should leave content unchanged. Mutation proof needs a separate read-only D1 query using the isolated state path.
- An unreachable precondition or failed browser command must be reported with its output and recorded in the feature's `Gotchas`.
- A different route or entry point does not make a skipped journey verified.

## Features

- [Browse and read posts](./browse-posts.md) covers the homepage article stream, the complete index, and post content with telemetry, table of contents, and related posts.
- [Find a post with live search](./live-search.md) covers header search across posts and pages, result navigation, and the separate full search page.
- [Browse tag archives](./tag-archives.md) covers tag links on cards and articles, filtered archives, and the unknown-tag 404.
- [Open a page and select a theme](./pages-and-theme.md) covers footer page navigation, rich-text page rendering, and theme selection, persistence, and system following.
- [Read a linked product card](./product-cards.md) covers the sponsored product block rendered by review posts.
- [Subscribe through the RSS feed](./rss-feed.md) covers the footer feed link and the feed the site serves.
