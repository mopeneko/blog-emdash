# Find a post with live search

Visitors can type in the header's live search to find posts and pages, open a result, or use the dedicated `/search` page for title, excerpt, and body matches on posts with its own empty-query state.

## Sub-features

- `live-search-match` shows matching seeded content while typing in the header, across `posts` and `pages`.
- `live-search-open` opens the selected result through the actual result link.
- `search-page-match` submits a query on `/search` and renders matching post cards.
- `search-page-empty` distinguishes no matches from an empty query.

## How to get to it (user POV)

- Use the `記事・ページを検索...` field in any public page's header, or press Ctrl/Cmd+K.
- Navigate directly to `/search`, fill `キーワードを入力...`, and choose `検索`.
- On an existing search page, replace the query and submit again.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- Seed post `docker-compose-healthcheck` has title `Docker ComposeでDBを待機してから接続する(healthcheck)`; seed page `privacy-policy` has title `プライバシーポリシー`.
- The header input's placeholder is `記事・ページを検索...`; a search for `Search...` matches nothing.

- **Live-search input.** Run `agent-browser open "$BASE_URL/"` then `agent-browser fill '.site-search-input' 'Docker Compose'`. Wait with `agent-browser wait '.site-search-results a'`, then run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/live-search-match.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/live-search-match.png" --full`. The results contain the Docker Compose title with a `POSTS` collection label; the homepage remains in the background.
- **Cross-collection results.** With the same page, run `agent-browser fill '.site-search-input' 'プライバシー'` and `agent-browser wait '.site-search-results a'`. The results contain both the post `ブログでユーザーのプライバシーを保護する方法` (`POSTS`) and the page `プライバシーポリシー` (`PAGES`); `agent-browser get count '.site-search-results a'` returns `2`.
- **No header matches.** Run `agent-browser fill '.site-search-input' 'zzz-nothing-20261111'` and `agent-browser wait '.emdash-live-search-no-results'`. Its text is `No results found`.
- **Live-search result.** Run `agent-browser fill '.site-search-input' 'Docker Compose'`, `agent-browser wait '.site-search-results a'`, then `agent-browser click '.site-search-results a'` and `agent-browser wait '.article-title'`. The URL is `$BASE_URL/posts/docker-compose-healthcheck` and `.article-title` is the exact title above. Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/live-search-open.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/live-search-open.png" --full`.
- **Dedicated search.** Run `agent-browser open "$BASE_URL/search"`, `agent-browser fill '.search-input[name="q"]' 'Docker Compose'`, and `agent-browser click '.search-button'`. Wait for `.search-summary`. The URL is `/search?q=Docker+Compose` (or equivalent encoding), the summary is `「Docker Compose」の検索結果は 1 件です。`, and `.search-results` contains one `.post-card` linking to `/posts/docker-compose-healthcheck`.
- **No-match query.** Run `agent-browser fill '.search-input[name="q"]' 'definitely-no-such-post-20261111'` then `agent-browser click '.search-button'` and wait for `.search-summary`. The summary is `「definitely-no-such-post-20261111」の検索結果は 0 件です。` and `agent-browser get count '.search-results .post-card'` returns `0`. The `.search-results` container itself is always rendered, so its presence is not evidence of matches.
- **Empty query.** Run `agent-browser open "$BASE_URL/search"` and inspect `.search-hint`. It reads `タイトル、抜粋、本文から検索できます。`, `agent-browser get count '.search-summary'` returns `0`, and `.search-results .post-card` count is `0`.

## Gotchas

- Header live search is not a form submission. Pressing Enter does not navigate to `/search` (there is no `searchPage` prop), so choose the result link instead.
- Wait for `.site-search-results a`, not a fixed delay, because the widget fetches asynchronously after a debounce.
- Refill the input rather than relying on stale refs after results rerender.
- The header widget and `/search` use different mechanisms: the widget queries EmDash's full-text index over `posts` and `pages` (titles and bodies; `posts.excerpt` is not indexed), while `/search` loads every post and does a server-side substring match over title, excerpt, and body text, and never searches `pages`. Report differing result sets rather than treating them as identical. Baseline seed has no `excerpt` values.
- Search terms with spaces can produce `+` or `%20` in the URL. Compare decoded `q`, not its exact encoding.
- `/search` is reachable only by URL; no public link points to it. That is navigation by design, not a missing footer entry.
