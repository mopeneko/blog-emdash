# Subscribe through the RSS feed

Visitors can reach the site's RSS feed from the footer and receive the newest published posts as feed items.

## Sub-features

- `rss-footer-link` navigates to the feed from the footer's `RSS` link.
- `rss-items` serves the newest published posts, each with an absolute link back to its article.

## How to get to it (user POV)

- Choose `RSS` in the footer link row on any public page.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- The feed lists at most the newest 20 published posts, and only posts with a publication date.

- **Footer link.** Run `agent-browser open "$BASE_URL/"`, then `agent-browser click '.footer-links a[href="/rss.xml"]'`. The URL is `$BASE_URL/rss.xml` and the document body starts with `<?xml version="1.0" encoding="UTF-8"?>`.
- **Feed content.** Run `curl -sS "$BASE_URL/rss.xml" > "$RUN_DIR/rss.xml"` and check `<channel><title>` for `mopeneko`, `<language>` for `en-us`, `grep -c '<item>'` for `20`, and that the first `<item><link>` is an absolute `$BASE_URL/posts/<slug>` URL.
- **Proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/rss-feed.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/rss-feed.png" --full` with the browser at the feed URL.

## Gotchas

- `<language>` is hardcoded `en-us` even though the site is Japanese; that is current behavior, not a localized failure.
- `<link>` values use the request origin, so they show `http://127.0.0.1:4331` in this run. Assert the origin plus path, not a production domain.
- The feed's item order follows `published_at desc`; import time is shared across seeded rows, so do not assert a specific article ordering between rows.
- The feed renders the page as XML text in the browser; a visual screenshot proves navigation, not item contents. Use the curl checks for content.
