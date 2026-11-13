---
name: verify-blog
description: Verify blog-emdash's public Astro/EmDash web UI in a real browser with isolated Cloudflare D1/R2 state. Use after changing public routes, search, navigation, post rendering, or theme controls.
---

# Verify blog-emdash

The primary surface is the public blog at `/`; the admin UI is at `/_emdash/admin`. This skill drives the public site with `agent-browser`, using a fresh local D1/R2 instance seeded from `seed/seed.json`. It does not connect to production.

## Launch

Prerequisites: `bun`, dependencies installed with `bun install`, and `agent-browser` plus its Chromium binary (`agent-browser doctor`). The seed downloads its referenced media from `images.microcms-assets.io`, so first-time setup needs network access.

From the repository root, choose a new run ID and start exactly one server on an unused port (default `4331`):

```bash
export RUN_ID="$(date +%Y%m%d-%H%M%S)"
export RUN_DIR="$PWD/.verification/runs/$RUN_ID"
export BASE_URL="http://127.0.0.1:4331"
export BLOG_VERIFY_STATE="$RUN_DIR/state"
export AGENT_BROWSER_SESSION="blog-verify-$RUN_ID"
export EVIDENCE_DIR="$RUN_DIR/evidence"
mkdir -p "$RUN_DIR/evidence"
bunx emdash seed seed/seed.json --validate
```

Start the server as a named background service, not an interactive foreground process:

```bash
WRANGLER_SEND_METRICS=false bun run dev -- \
  --config .agents/skills/verify-blog/astro.verify.mjs \
  --host 127.0.0.1 --port 4331 > "$RUN_DIR/server.log" 2>&1
```

For OMP's `bash` tool, add `name: "blog-verify-$RUN_ID"`, `timeout: 0`, and readiness on the port (`ready: { port: 4331 }`), not on a log line: stdout is redirected into `$RUN_DIR/server.log`, so the readiness matcher sees no output and a log-based readiness check never completes. Readiness is only "the port is listening" — the first Astro/workerd start can take 20–60 seconds after that while Vite optimizes dependencies, so follow the readiness signal with the setup calls below, which are the real usability check. If they fail, inspect `$RUN_DIR/server.log` before retrying.

`astro.verify.mjs` replaces the base adapter with `cloudflare({ persistState: { path: BLOG_VERIFY_STATE } })`; the port must be free. `4331` and the run-specific state/browser session allow independent verification runs. Do not use port `4321` or `.wrangler/state`, which are the normal development instance and its data.

Initialize migrations, the development admin, and seeded content:

```bash
curl --fail-with-body --max-time 180 -sS \
  "$BASE_URL/_emdash/api/setup/dev-bypass" | tee "$RUN_DIR/setup.json"
curl --fail-with-body --max-time 30 -sS "$BASE_URL/" > "$RUN_DIR/home.html"
```

The first response must contain `"message":"Dev setup complete"`. The homepage must contain the seeded heading `ブログでユーザーのプライバシーを保護する方法`; that is the usable-content readiness check, not merely an HTTP listener. The `dev-bypass` endpoint is development-only setup, not a substitute for exercising public feature paths. Seeded media import runs as part of setup and can take a while on first launch; if the homepage is missing posts, re-check `$RUN_DIR/server.log` for in-progress downloads before concluding the seed failed.

## Doctor

Run this read-only check before driving and whenever behavior looks wrong:

```bash
curl --fail-with-body --max-time 10 -sS "$BASE_URL/" \
  | grep -F 'ブログでユーザーのプライバシーを保護する方法'
bunx emdash whoami --url "$BASE_URL" --json | tee "$RUN_DIR/doctor.json"
agent-browser --session "$AGENT_BROWSER_SESSION" session info --json
```

Require the seeded heading, `"authMethod":"dev-bypass"`, and the same `$BASE_URL`. Check the server log for the recorded Astro/EmDash versions. With OMP, inspect the named service via `proc://blog-verify-$RUN_ID` and confirm its listener with `ss -ltnp 'sport = :4331'`; this proves port ownership without killing another process. Browser `active:false` before `open` is expected; after browser use it must identify `$AGENT_BROWSER_SESSION`.

Never drive an existing server you did not start for this run. If doctor reports the wrong origin or data, stop and create a fresh run instead of mutating shared state.

## Drive

Use the isolated session on every command. `snapshot -i --urls` yields current `@e…` refs; refresh it after navigation or re-rendering. Prefer role/name or the repo's stable selectors over screen coordinates.

```bash
agent-browser open "$BASE_URL/"
agent-browser snapshot -i --urls
agent-browser fill '.site-search-input' 'Docker Compose'
agent-browser wait '.site-search-results a'
agent-browser click '.site-search-results a'
agent-browser wait '.article-title'
agent-browser get url
agent-browser get text '.article-title'
```

Expected end state: `/posts/docker-compose-healthcheck` with heading `Docker ComposeでDBを待機してから接続する(healthcheck)`. The header's `LiveSearch` opens results on input; Enter is not its submission path, and its placeholder is `記事・ページを検索...`. The separate `/search` page has `input.search-input[name="q"]`, `.search-button`, and results under `.search-results`.

Other real handles in the current theme:

|Target|Handle|
|---|---|
|Site identity|`.site-title` reads `mopeneko`; footer brand `.footer-domain` reads `blog.lem0n.cc`|
|Homepage stream|`.article-stream > header h2` reads `RECENT ARTICLES`; cards are `article.post-card` with `.post-card__title a`, `.post-card__meta`, and `a.tag` chips|
|Post index|footer link `.footer-links a[href="/posts"]`; `.archive-label` `ARCHIVE`, `.archive-header h1` `すべての記事`, `.archive-count` `20 記事`|
|Article|`.article-title`, `.writing-telemetry`, `.article-content`, `#toc-content .toc-link` (populated client-side; the element is an id, not a class), `.more-posts` with heading `続けて読む`|
|Tag archive|`.archive-label` `TAG`, `.archive-title` `#Docker`, `.archive-count` `1 記事`, cards in `.article-stream`|
|Page|`.page-title`, `.page-content`; entered from `.footer-links a[href="/pages/privacy-policy"]`|
|Theme|`.theme-switcher` radio group: `input[name="color-scheme"][value="light"|"dark"|"system"]`, labels `ライト`/`ダーク`/`システム`; header button `.header-theme` whose `aria-label` flips between `ライトモードに切り替える` and `ダークモードに切り替える`. State lives in `meta[name="color-scheme"]` and `localStorage["color-scheme"]`|
|Product block|`.product-card`, `.product-card__label`, `.product-card__maker`, `.product-card__title`, `.product-card__link`|
|Feed|`.footer-links a[href="/rss.xml"]`|

Read `features/README.md`, then the file for each feature being checked. Every listed journey is a separate requirement; do not mark an untested journey verified.

## Evidence

Store evidence under `$RUN_DIR/evidence/`; keep server logs and doctor output beside it. Record the feature ID and entry point with each proof. Use the feature files' exact snapshot and screenshot names.

```bash
agent-browser snapshot -i --urls > "$RUN_DIR/evidence/article.aria.txt"
agent-browser screenshot "$EVIDENCE_DIR/article.png" --full
```

Pass an explicit path in `$EVIDENCE_DIR` to `screenshot`; the CLI can fall back to the current directory or a temporary directory when only a relative filename is supplied. Do not use the `selector path` positional form: it treats its first argument as a selector and falls back to a temporary screenshot.

Proof standards:

- Exercise the actual link, field, button, or form, then observe the resulting page; do not inject content into the DOM or call internal setters.
- Capture the interaction state and the resulting state, including an ARIA snapshot and screenshot with the site identity visible.
- Read-only journeys have no database side effect. For admin mutations, additionally read the row through `bunx wrangler d1 execute DB --local --persist-to="$BLOG_VERIFY_STATE" --command '<SELECT>' --json`; prove the expected row was written rather than trusting a toast.
- Do not post comments or publish admin content in the default public-site verification run. Baseline `posts` does not enable comments, so the article comment container renders empty; that is configuration, not breakage. If a task specifically covers mutations, disclose them and keep them inside this disposable state.
- No mocks are configured. Seed media downloads and external article, product, and advertising links remain real; do not treat those external sites as verified.
- A failed command is a failure, not a skip. Report its output and any unmet seed/network/auth precondition in the feature's `Gotchas`.

## Cleanup

Close only this run's browser session, then stop only its named server:

```bash
agent-browser --session "$AGENT_BROWSER_SESSION" close
```

For OMP, write empty content to `proc://blog-verify-$RUN_ID/kill`. If the server was launched manually, kill the recorded PID, never a process-name pattern. Remove only the state directory, after stopping the server, and guard the expansion so an unset variable cannot widen the delete:

```bash
rm -rf "${RUN_DIR:?}/state"
ss -ltnp 'sport = :4331'
ls "$RUN_DIR/evidence" | wc -l
```

Retain `$RUN_DIR/evidence`, `server.log`, `setup.json`, `doctor.json`, and any feed capture. Confirm the evidence files still exist before reporting the run: `state` is the only directory that should disappear.

## Helpers

`astro.verify.mjs` is the isolation helper. It requires an absolute or project-relative `BLOG_VERIFY_STATE`, imports the production Astro config, and replaces only its Cloudflare adapter's local persistence path. Invoke it through the launch command above. No general-purpose test runner or test-only content API is introduced.
