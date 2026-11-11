# Read a linked product card

Review posts can link a product entry; the article then renders a sponsored block with the maker, product name, and outbound purchase links.

## Sub-features

- `product-card-render` renders the sponsored product block on an article whose seed entry references a product.
- `product-card-links` exposes the product's purchase links with their real destinations.
- `product-card-absent` renders no product block on posts without a product reference.

## How to get to it (user POV)

- Open a review article such as `/posts/fiio-k13-r2r-review`, `/posts/v-moda-m-200-review`, or `/posts/cbg9-review`.
- Read the block between the article body and the comments, labelled `スポンサーリンク`.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- Exactly three seeded posts reference a product: `fiio-k13-r2r-review`, `v-moda-m-200-review`, `cbg9-review`. The other 17 posts have no product reference.

- **Product block.** Run `agent-browser open "$BASE_URL/posts/fiio-k13-r2r-review"` and `agent-browser wait '.product-card'`. `.product-card__label` reads `スポンサーリンク`, `.product-card__maker` reads `FiiO`, and `.product-card__title` reads `K13 R2R`.
- **Purchase links.** `agent-browser get count '.product-card__link'` returns `4`; the first `.product-card__link` href is an external `https://` affiliate URL (for this post, `https://s.click.aliexpress.com/...`). Collect `agent-browser get attr '.product-card__link' href` for the visible links; do not follow them.
- **Absent block.** Run `agent-browser open "$BASE_URL/posts/docker-compose-healthcheck"` and `agent-browser wait '.article-title'`. `agent-browser get count '.product-card'` returns `0`.
- **Proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/product-cards.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/product-cards.png" --full` while the FiiO article is open; the evidence shows the label, product name, and link labels.

## Gotchas

- Links are external affiliate destinations. Verifying that they resolve is out of scope; the local journey ends at the rendered href.
- Seed product `ji0svu05inow` has no image and no post references it, so no block shows it. An image-less product is not a missing block.
- The block is placed inside `.article-main` after `.article-content` and before `.article-comments`, so an `.article-content` text check will not see it; query `.product-card` directly.
- Do not click outbound links as part of evidence capture.
