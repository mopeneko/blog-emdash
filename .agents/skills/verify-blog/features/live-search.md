# Find a post with live search

Visitors can type in the header's live search, choose a matching post, or use the dedicated search page for title, excerpt, and body matches and an empty result state.

## Sub-features

- `live-search-match` shows a matching seeded post while typing in the header.
- `live-search-open` opens the selected post through the actual result link.
- `search-page-match` submits a query on `/search` and renders a result card.
- `search-page-empty` distinguishes no matches from an empty query.

## How to get to it (user POV)

- Use the `Search...` field in any public page's header.
- Navigate directly to `/search`, fill `Search posts...`, and choose `Search`.
- On an existing search page, replace the query and submit again.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- Seed post `docker-compose-healthcheck` has title `Docker ComposeでDBを待機してから接続する(healthcheck)` and a body mentioning `healthcheck`.

- **Live-search input.** Run `agent-browser open "$BASE_URL/"` then `agent-browser fill 'input.site-search-input[placeholder="Search..."]' 'Docker Compose'`. Wait with `agent-browser wait '.site-search-results a'`, then run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/live-search-match.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/live-search-match.png" --full`. The results contain the Docker Compose title; the homepage remains in the background.
- **Live-search result.** Run `agent-browser click '.site-search-results a'` then `agent-browser wait '.article-title'`. The URL is `$BASE_URL/posts/docker-compose-healthcheck` and `.article-title` is the exact title above. Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/live-search-open.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/live-search-open.png" --full`.
- **Dedicated search.** Run `agent-browser open "$BASE_URL/search"`, `agent-browser fill 'input.search-input[name="q"]' 'Docker Compose'`, and `agent-browser click '.search-button'`. Wait for `.search-summary`. The URL is `/search?q=Docker+Compose` (or equivalent percent encoding), the summary is `1 result for "Docker Compose"`, and `.search-results` contains the expected title.
- **No-match query.** Run `agent-browser fill 'input.search-input[name="q"]' 'definitely-no-such-post-20261109'` then `agent-browser click '.search-button'` and wait for `.search-summary`. The summary is `No results for "definitely-no-such-post-20261109"`, and `.search-results` is absent.
- **Empty query.** Run `agent-browser open "$BASE_URL/search"` and inspect `.search-hint`. It reads `Enter a search term to find posts.` and `agent-browser get count '.search-summary'` returns `0`.

## Gotchas

- Header live search is not a form submission. Pressing Enter does not navigate to `/search`; choose the result link instead.
- Wait for `.site-search-results a`, not a fixed delay, because the search widget fetches asynchronously.
- Refill the input rather than relying on stale refs after results rerender.
- `/search` matches titles, excerpts, and extracted Portable Text. It does not use the same full-text search endpoint as the header widget; report differing result sets rather than silently treating them as identical.
- Search terms with spaces can produce `+` or `%20` in the URL. Compare decoded `q`, not its exact encoding.
