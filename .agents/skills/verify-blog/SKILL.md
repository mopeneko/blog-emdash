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

For OMP's `bash` tool, add `name: "blog-verify-$RUN_ID"`, `timeout: 0`, and readiness `log: "watching for file changes"`. If readiness times out, inspect `$RUN_DIR/server.log` and the port before retrying; the initial Vite/workerd start may take longer than the readiness window.

`astro.verify.mjs` replaces the base adapter with `cloudflare({ persistState: { path: BLOG_VERIFY_STATE } })`; the port must be free. `4331` and the run-specific state/browser session allow independent verification runs. Do not use port `4321` or `.wrangler/state`, which are the normal development instance and its data.

Initialize migrations, the development admin, and seeded content:

```bash
curl --fail-with-body --max-time 180 -sS \
  "$BASE_URL/_emdash/api/setup/dev-bypass" | tee "$RUN_DIR/setup.json"
curl --fail-with-body --max-time 30 -sS "$BASE_URL/" > "$RUN_DIR/home.html"
```

The first response must contain `"message":"Dev setup complete"`. The homepage must contain the seeded heading `ブログでユーザーのプライバシーを保護する方法`; that is the usable-content readiness check, not merely an HTTP listener. The `dev-bypass` endpoint is development-only setup, not a substitute for exercising public feature paths.

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
agent-browser fill 'input.site-search-input[placeholder="Search..."]' 'Docker Compose'
agent-browser wait '.site-search-results a'
agent-browser click '.site-search-results a'
agent-browser wait '.article-title'
agent-browser get url
agent-browser get text '.article-title'
```

Expected end state: `/posts/docker-compose-healthcheck` with heading `Docker ComposeでDBを待機してから接続する(healthcheck)`. The header's `LiveSearch` opens results on input; Enter is not its submission path. The separate `/search` page has `input.search-input[name="q"]` and `.search-button`, with results under `.search-results`.

Other real handles: `.featured-title-link` for the homepage's featured post, `.posts-list .post-link` for the post index, `.meta-tag` and `.card-tag` for tag archives, `.footer-links a[href="/pages/privacy-policy"]` for the privacy page, and the accessible buttons `Light mode`, `Dark mode`, and `System theme` in `.theme-switcher`.

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
- Do not post comments or publish admin content in the default public-site verification run. If a task specifically covers mutations, disclose them and keep them inside this disposable state.
- No mocks are configured. Seed media downloads and external article links remain real; do not treat those external sites as verified.
- A failed command is a failure, not a skip. Report its output and any unmet seed/network/auth precondition in the feature's `Gotchas`.

## Cleanup

Close only this run's browser session, then stop only its named server:

```bash
agent-browser --session "$AGENT_BROWSER_SESSION" close
```

For OMP, write empty content to `proc://blog-verify-$RUN_ID/kill`. If the server was launched manually, kill the recorded PID, never a process-name pattern. Remove `$RUN_DIR/state` after stopping the server; retain `$RUN_DIR/evidence`, `server.log`, `setup.json`, and `doctor.json`. Confirm the evidence files still exist before reporting the run.

## Helpers

`astro.verify.mjs` is the isolation helper. It requires an absolute or project-relative `BLOG_VERIFY_STATE`, imports the production Astro config, and replaces only its Cloudflare adapter's local persistence path. Invoke it through the launch command above. No general-purpose test runner or test-only content API is introduced.
