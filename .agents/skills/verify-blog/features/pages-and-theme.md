# Open the privacy page and select a theme

Visitors can navigate to a seeded rich-text page from the footer and choose a light, dark, or system theme that persists across page navigation.

## Sub-features

- `footer-page` opens the seeded privacy policy through its footer link.
- `page-content` renders the page title and Portable Text sections.
- `theme-dark` applies and persists an explicit dark theme.
- `theme-light` switches the same browser session to light mode.
- `theme-system` removes the explicit preference and follows the browser's color scheme.

## How to get to it (user POV)

- Choose `プライバシーポリシー` in the homepage footer's Navigate section.
- Use the `Light mode`, `Dark mode`, and `System theme` buttons in the footer.

## Driving it with agent-browser

Preconditions:

- The baseline in `features/README.md` holds.
- This is a new isolated browser session, so there is no preexisting `theme` cookie.

- **Footer page entry.** Run `agent-browser open "$BASE_URL/"`, then `agent-browser click '.footer-links a[href="/pages/privacy-policy"]'` and `agent-browser wait '.page-title'`. The URL is `/pages/privacy-policy`, `.page-title` reads `プライバシーポリシー`, and `.page-content` contains heading `広告について`.
- **Page proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/footer-page.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/footer-page.png" --full`. The page shows the site identity and the privacy-policy heading.
- **Dark theme.** Run `agent-browser find role button click --name 'Dark mode'`, then `agent-browser eval '({theme:document.documentElement.className,cookie:document.cookie})'`. `theme` is `dark`, the cookie contains `theme=dark`, and `.theme-btn[data-theme="dark"]` has class `active`.
- **Persistence.** Run `agent-browser open "$BASE_URL/posts"` then repeat the eval. `document.documentElement.classList.contains("dark")` remains true and the cookie remains `theme=dark`.
- **Light theme.** Run `agent-browser find role button click --name 'Light mode'`, then repeat the eval. `theme` is `light` and the cookie is `theme=light`.
- **System theme.** Run `agent-browser set media light`, then `agent-browser find role button click --name 'System theme'`. Repeat the eval: the root has neither `light` nor `dark`, and no `theme=` cookie remains. Run `agent-browser set media dark`; the root becomes `dark` without an explicit theme cookie.
- **Theme proof.** After the dark-mode step, run `agent-browser screenshot "$EVIDENCE_DIR/theme-dark.png" --full` and `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/theme-dark.aria.txt"`. Use `$EVIDENCE_DIR/theme-system.png` / `theme-system.aria.txt` after the system-preference step.

## Gotchas

- Theme controls are at the bottom of long pages; the browser driver scrolls them into view automatically. Do not click by coordinates.
- `System theme` removes the `theme` cookie. Under a dark OS/browser preference the root still has the `dark` class; that is not a failure.
- Theme state belongs to the isolated browser profile, not D1. No content mutation is expected.
- If the footer does not contain `プライバシーポリシー`, the seeded page is missing or the footer query changed. Record the failed precondition; do not substitute a direct `/pages/privacy-policy` visit and call the footer entry verified.
- The privacy page contains external advertising and opt-out links. Do not follow them as part of this local UI journey.
