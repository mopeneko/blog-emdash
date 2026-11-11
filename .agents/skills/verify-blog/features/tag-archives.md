# Browse tag archives

Visitors can use a tag chip on a post card or article, or a direct archive URL, to find other articles with that tag, then return from the archive to an individual post.

## Sub-features

- `tag-entry` opens the Docker archive from a post card's tag chip.
- `tag-filter` displays the `#Docker` label, the Japanese post count, and only associated post cards.
- `tag-open-post` opens a filtered article from the archive.
- `tag-unknown` sends an unknown tag slug to the not-found page.

## How to get to it (user POV)

- Open `/posts` and choose the `#Docker` chip on the Docker Compose card.
- On an article page, choose its `#Docker` chip beneath the title.
- Navigate directly to `/tag/c7bgl_mqmj1`.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- The seeded Docker tag is `Docker` with slug `c7bgl_mqmj1`; the taxonomy name is `tag`, not `tags`. Exactly one seeded post carries it: `docker-compose-healthcheck`.

- **Card tag entry.** Run `agent-browser open "$BASE_URL/posts"` then `agent-browser click '.post-card:has(a[href="/posts/docker-compose-healthcheck"]) a.tag[href="/tag/c7bgl_mqmj1"]'` and `agent-browser wait '.archive-title'`. The URL is `/tag/c7bgl_mqmj1`, `.archive-label` reads `TAG`, and `.archive-title` reads `#Docker`.
- **Filtered list.** Run `agent-browser get text '.archive-count'`; it reads `1 記事`. `agent-browser get text '.archive-section'` contains `Docker ComposeでDBを待機してから接続する(healthcheck)`, `agent-browser get count '.article-stream .post-card'` returns `1`, and that card carries both `a.tag[href="/tag/c7bgl_mqmj1"]` and `a.tag[href="/tag/vmel1ny8fe"]` (its two seeded tags). Capture `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/tag-entry.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/tag-entry.png" --full` before leaving the archive.
- **Filtered article entry.** Run `agent-browser click '.article-stream .post-card__title a[href="/posts/docker-compose-healthcheck"]'` then `agent-browser wait '.article-title'`. The article URL and heading are the expected Docker Compose post, and `agent-browser get count 'a.tag[href="/tag/c7bgl_mqmj1"]'` is at least `1` in the header tag row.
- **Proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/tag-open-post.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/tag-open-post.png" --full` for the article.
- **Unknown tag.** Run `agent-browser open "$BASE_URL/tag/not-a-seeded-tag"` then `agent-browser wait '.not-found'`. The final URL is `/404`, `.not-found h1` reads `404`, and `agent-browser get count '.archive-section'` returns `0`; an unknown tag never renders an archive labelled as valid.

## Gotchas

- Tag slugs are imported microCMS identifiers, not human-readable names. Do not change `c7bgl_mqmj1` to `docker`.
- Tags are chips rendered by `TagList`: `a.tag` inside `ul.tag-list`, with the label as `#{label}`. The older `.post-item`/`a.post-tag` structure is gone, and there is no separate "metadata column": article tags sit inline beneath the title.
- The archive header uses `.archive-label` `TAG`, `.archive-title` `#<label>`, and `.archive-count` `N 記事`; the list container is `.article-stream`, not `.posts-grid`.
- Every one of the 18 seeded tag terms has at least one post, so the valid-but-empty archive state (`このタグの記事はまだありません。`) cannot be reached without changing taxonomy assignments. Do not fake it with a direct DOM edit; record the unmet prerequisite instead.
- A tag with no posts and an unknown tag are different states: the unknown slug redirects to `/404`, while a known term simply renders an empty `.article-stream`.
- Do not assert a fixed tag count after a task intentionally changes seed taxonomy assignments.
