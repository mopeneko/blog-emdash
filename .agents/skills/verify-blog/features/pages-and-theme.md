# Open a page and select a theme

Visitors can navigate to a seeded rich-text page from the footer, choose a light, dark, or system theme from the footer switch or the header cycle button, and keep that choice across page navigation.

## Sub-features

- `footer-page` opens a seeded page such as the privacy policy through its footer link.
- `page-content` renders the page title and Portable Text sections.
- `theme-dark` applies and persists an explicit dark theme.
- `theme-light` switches the same browser session to light mode.
- `theme-system` removes the explicit preference and follows the browser's color scheme.
- `theme-header-cycle` advances light → dark → system from the header button.

## How to get to it (user POV)

- Choose `プライバシーポリシー` or `免責事項` in the footer link row (there is no labelled `Navigate` section).
- Use the `ライトモード`, `ダークモード`, and `システムテーマ` buttons at the bottom of the footer, or the header's `テーマを切り替える` button.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- This is a new isolated browser session, so there is no preexisting `theme` cookie (`agent-browser eval 'document.cookie'` returns `""`).
- The footer buttons' accessible names come from `aria-label` and are Japanese: `ライトモード`, `ダークモード`, `システムテーマ`. The visible text is `Light`, `Dark`, `System`. Clicking `--name 'Dark mode'` fails.

- **Footer page entry.** Run `agent-browser open "$BASE_URL/"`, then `agent-browser click '.footer-links a[href="/pages/privacy-policy"]'` and `agent-browser wait '.page-title'`. The URL is `/pages/privacy-policy`, `.page-title` reads `プライバシーポリシー`, and `.page-content h2` first reads `広告について`. The footer's pages come from the `pages` collection, so `免責事項` (`/pages/disclaimer`) appears the same way.
- **Page proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/footer-page.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/footer-page.png" --full`. The page shows the site identity and the privacy-policy heading.
- **Dark theme.** Run `agent-browser find role button click --name 'ダークモード'` (or click `.theme-btn[data-theme="dark"]`), then `agent-browser eval '({theme:document.documentElement.className,cookie:document.cookie,active:document.querySelector(".theme-btn[data-theme=\"dark\"]").classList.contains("active"),pressed:document.querySelector(".theme-btn[data-theme=\"dark\"]").getAttribute("aria-pressed")})'`. `theme` is `dark`, the cookie contains `theme=dark`, `active` is `true`, and `pressed` is `"true"`.
- **Persistence.** Run `agent-browser open "$BASE_URL/posts"` then repeat the eval. `document.documentElement.className` remains `dark` (the cookie is applied before paint) and the cookie remains `theme=dark`.
- **Light theme.** Run `agent-browser find role button click --name 'ライトモード'`, then repeat the eval. `theme` is `light` and the cookie is `theme=light`.
- **System theme.** Run `agent-browser set media light`, then `agent-browser find role button click --name 'システムテーマ'`. Repeat the eval: the root class is empty (no `light`, no `dark`) and no `theme=` cookie remains. Run `agent-browser set media dark`; the root becomes `dark` without an explicit theme cookie.
- **Header cycle.** From a state with no `theme` cookie, run `agent-browser click '.header-theme'` and repeat the eval; the class becomes `light` and the cookie `theme=light`. Click again: `dark`. Click a third time: the cookie is gone and the class follows the current `prefers-color-scheme`.
- **Theme proof.** After the dark-mode step, run `agent-browser screenshot "$EVIDENCE_DIR/theme-dark.png" --full` and `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/theme-dark.aria.txt"`. Use `$EVIDENCE_DIR/theme-system.png` / `theme-system.aria.txt` after the system-preference step.

## Gotchas

- Theme controls are at the bottom of long pages; the browser driver scrolls them into view automatically. Do not click by coordinates.
- `システムテーマ` removes the `theme` cookie. Under a dark OS/browser preference the root still has the `dark` class; that is not a failure.
- The root element class is exactly `dark`, `light`, or empty; nothing else adds classes to `document.documentElement`.
- The `light` class has no dedicated token block; light is the default and the media query excludes it with `:root:not(.light)`. Assert the class and cookie, not a computed color.
- Theme state belongs to the isolated browser profile, not D1. No content mutation is expected.
- If the footer does not contain `プライバシーポリシー`, the seeded `pages` entry is missing or the footer pages query changed. Record the failed precondition; do not substitute a direct `/pages/privacy-policy` visit and call the footer entry verified.
- The privacy page contains external advertising and opt-out links. Do not follow them as part of this local UI journey.
