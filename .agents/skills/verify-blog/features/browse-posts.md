# Browse and read posts

Visitors can discover a featured article and recent posts on the homepage, inspect the full post index, and read an article with its metadata, body, and related posts.

## Sub-features

- `home-featured` renders the seeded featured article and opens it through its title.
- `home-latest` renders recent post cards and links to the full index.
- `posts-index` lists all seeded published posts.
- `post-content` renders the article's Portable Text body and reading metadata.

## How to get to it (user POV)

- Open `/` and choose the featured article's title or image.
- Choose `View all` beside `Latest`, or the footer's `All Posts` link.
- Choose a post title in `/posts`.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- `$AGENT_BROWSER_SESSION` and `$AGENT_BROWSER_SCREENSHOT_DIR` name this run's browser and evidence directory.

- **Homepage.** Run `agent-browser open "$BASE_URL/"` then `agent-browser snapshot -i --urls`. The site identity `My Blog`, a featured heading `ブログでユーザーのプライバシーを保護する方法`, `Latest`, and `View all` are visible. The featured link targets `/posts/indivisual-blog-privacy`.
- **Featured entry.** Run `agent-browser click '.featured-title-link'` then `agent-browser wait '.article-title'`. The URL is `/posts/indivisual-blog-privacy`, and `.article-title` has the same heading.
- **Post body.** Run `agent-browser get text '.article-content'`, `agent-browser get text '.article-meta-col'`, and `agent-browser get text '.more-posts'`. The body is nonempty and the metadata contains `Published`, `Reading time`, and `Tags`; related posts are under `Continue reading`. A populated `.toc-content` contains links for the article's headings.
- **Index entry.** Return with `agent-browser open "$BASE_URL/"`, then run `agent-browser click '.section-link'` and `agent-browser wait '.posts-page'`. The URL is `/posts`; `.page-title` reads `All Posts` and `.page-description` reports `20 articles` for the baseline seed.
- **Read from index.** Run `agent-browser click '.posts-list a[href="/posts/docker-compose-healthcheck"]'` then `agent-browser wait '.article-title'`. The URL is `/posts/docker-compose-healthcheck` and its title is `Docker ComposeでDBを待機してから接続する(healthcheck)`.
- **Proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/posts-index-article.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/posts-index-article.png" --full`. The evidence shows the site identity and the article reached through the index.

## Gotchas

- The homepage shows at most seven posts: one featured post and six cards. Use `/posts`, not the homepage, to verify all twenty seed posts.
- The featured item is the newest post with a featured image, not necessarily the first item in the seed file.
- The seed has no explicit publication timestamps; imported post dates use the import time. Do not assert a fixed calendar date.
- A missing `View all` link is a real difference only when the number of available posts no longer exceeds the homepage limit.
- The `/posts` and article views include comments and sidebar content; evidence must identify the intended article rather than relying on generic text elsewhere.
