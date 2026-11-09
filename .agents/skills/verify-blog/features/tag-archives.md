# Browse tag archives

Visitors can use a post's tag to find other articles with that tag, then return from the archive to an individual post.

## Sub-features

- `tag-entry` opens the Docker archive from a post card's tag link.
- `tag-filter` displays the Docker label and only associated post cards.
- `tag-open-post` opens a filtered article from the archive.

## How to get to it (user POV)

- Open `/posts` and choose the `Docker` tag on the Docker Compose article.
- On an article page, choose its `Docker` tag in the metadata column.
- Navigate directly to `/tag/c7bgl_mqmj1`.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- The seeded Docker tag is `Docker` with slug `c7bgl_mqmj1`; the taxonomy name is `tag`, not `tags`.

- **Card tag entry.** Run `agent-browser open "$BASE_URL/posts"` then `agent-browser click '.post-item:has(a[href="/posts/docker-compose-healthcheck"]) a.post-tag[href="/tag/c7bgl_mqmj1"]'` and `agent-browser wait '.archive-title'`. The URL is `/tag/c7bgl_mqmj1`, `.archive-label` reads `Tag`, and `.archive-title` reads `Docker`.
- **Filtered list.** Run `agent-browser get text '.archive-section'`. It contains `1 post` and `Docker ComposeでDBを待機してから接続する(healthcheck)`; `agent-browser get count '.posts-grid .post-card'` returns `1` under the baseline seed. Capture `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/tag-entry.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/tag-entry.png" --full` before leaving the archive.
- **Filtered article entry.** Run `agent-browser click '.posts-grid a[href="/posts/docker-compose-healthcheck"]'` then `agent-browser wait '.article-title'`. The article URL and heading are the expected Docker Compose post. The metadata has a link to `/tag/c7bgl_mqmj1`.
- **Proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/tag-open-post.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/tag-open-post.png" --full` for the article.
- **Unknown tag.** Run `agent-browser open "$BASE_URL/tag/not-a-seeded-tag"` then `agent-browser wait '.not-found'`. The `.not-found` heading is `404`; the not-found page is shown instead of an empty archive incorrectly labelled as a valid tag.

## Gotchas

- Tag slugs are imported microCMS identifiers, not human-readable names. Do not change `c7bgl_mqmj1` to `docker`.
- The homepage limits cards to two visible tags; use `/posts` or the article's metadata for a deterministic Docker link.
- A valid tag with no posts displays `No posts with this tag yet.`; an unknown tag goes to the 404 page. These are distinct states.
- Do not assert a fixed tag count after a task intentionally changes seed taxonomy assignments.
