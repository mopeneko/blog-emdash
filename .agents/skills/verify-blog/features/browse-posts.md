# Browse and read posts

Visitors discover every published post on the homepage, can switch to the complete index, and read an article with its telemetry, body, table of contents, and related posts.

## Sub-features

- `home-stream` renders the homepage `RECENT ARTICLES` stream with one card per published post and links each title to its article.
- `posts-index` lists all seeded published posts at `/posts` with an `ARCHIVE` header and a post count.
- `post-content` renders the article's Portable Text body plus the writing-telemetry block, tag chips, table of contents, and `続けて読む` related posts.

## How to get to it (user POV)

- Open `/` and choose a post title in the `RECENT ARTICLES` stream.
- Choose `すべての記事` in the footer's link row, which is the only route to `/posts` (the header nav is a CMS menu and is empty for this seed).
- On `/posts`, choose a post title.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- `$AGENT_BROWSER_SESSION` and `$EVIDENCE_DIR` name this run's browser and evidence directory.

- **Homepage stream.** Run `agent-browser open "$BASE_URL/"` then `agent-browser wait '.post-card'` and `agent-browser snapshot -i --urls`. The site identity `mopeneko`, the section heading `RECENT ARTICLES`, and the counter `20 記事` are visible. `agent-browser get count '.post-card'` returns `20`; every card has a `.post-card__title a` with an `/posts/<slug>` href, a `.post-card__meta` line, and `a.tag` chips. There is no featured block, no `Latest` heading, and no `View all` link; the old `.featured-title-link` and `.section-link` handles do not exist.
- **Stream entry.** Run `agent-browser click '.post-card__title a[href="/posts/indivisual-blog-privacy"]'` then `agent-browser wait '.article-title'`. The URL is `/posts/indivisual-blog-privacy`, and `.article-title` reads `ブログでユーザーのプライバシーを保護する方法`.
- **Post body.** Run `agent-browser get text '.article-content'`, `agent-browser get text '.writing-telemetry'`, and `agent-browser get text '.more-posts > .more-inner > h2'`. The body is nonempty; the telemetry contains a `YYYY.MM.DD` date, `N 文字`, `コード N断片`, and `読了 N分`; the related section heading is `続けて読む` with up to three `.post-card`s. Wait for `#toc-content .toc-link` before counting it: `agent-browser wait '#toc-content .toc-link'` then `agent-browser get count '#toc-content .toc-link'` returns a positive number on articles that have `h2`/`h3` headings. The container is the element with `id="toc-content"`, not a `.toc-content` class, and it is CSS-hidden below 960px width.
- **Index entry.** Return with `agent-browser open "$BASE_URL/"`, then run `agent-browser click '.footer-links a[href="/posts"]'` and `agent-browser wait '.archive-section'`. The URL is `/posts`; `.archive-label` reads `ARCHIVE`, `.archive-header h1` reads `すべての記事`, `.archive-count` reads `20 記事`, and `agent-browser get count '.article-stream .post-card'` returns `20`. There is no pagination, so the page and the homepage both render all twenty posts.
- **Read from index.** Run `agent-browser click '.article-stream .post-card__title a[href="/posts/docker-compose-healthcheck"]'` then `agent-browser wait '.article-title'`. The URL is `/posts/docker-compose-healthcheck` and its title is `Docker ComposeでDBを待機してから接続する(healthcheck)`.
- **Proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/posts-index-article.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/posts-index-article.png" --full`. The evidence shows the site identity and the article reached through the index.

## Gotchas

- The homepage renders every published post with no featured item and no cap; the earlier "seven posts" limit is gone. Use `/posts` for the archive framing and the homepage for the stream.
- `entry.id` is the slug, so `/posts/<slug>` URLs are correct; a missing slug redirects to `/404` rather than returning an HTTP 404 on the requested path.
- The seed has no explicit publication timestamps; imported post dates use the import time. Do not assert a fixed calendar date.
- The seed has no `excerpt` values, so `.article-excerpt` and `.post-card__excerpt` are absent on baseline content. A missing excerpt is expected; do not treat it as a rendering failure.
- The `/posts` and article views include a comments container and sidebar widgets; evidence must identify the intended article rather than relying on generic text elsewhere. Baseline `posts` does not enable comments, so the container renders empty.
- The article date renders in the telemetry block, not in an `.article-meta-col`; the old English labels `Published`/`Reading time`/`Tags` never appear.
