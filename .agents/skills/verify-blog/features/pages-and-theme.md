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
- This is a new isolated browser session, so `localStorage["color-scheme"]` is `null` and the page follows the system preference.
- The footer control is a radio group: `fieldset.theme-switcher` named `表示テーマ`, radios named `color-scheme`, each labelled by its visible text `ライト`/`ダーク`/`システム`. Click the input itself; the labels are not separate buttons.

- **Footer page entry.** Run `agent-browser open "$BASE_URL/"`, then `agent-browser click '.footer-links a[href="/pages/privacy-policy"]'` and `agent-browser wait '.page-title'`. The URL is `/pages/privacy-policy`, `.page-title` reads `プライバシーポリシー`, and `.page-content h2` first reads `広告について`. The footer's pages come from the `pages` collection, so `免責事項` (`/pages/disclaimer`) appears the same way.
- **Page proof.** Run `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/footer-page.aria.txt"` and `agent-browser screenshot "$EVIDENCE_DIR/footer-page.png" --full`. The page shows the site identity and the privacy-policy heading.
- **Theme state helper.** Every theme assertion reads the same three things: `agent-browser eval '(() => ({meta:document.querySelector("meta[name=color-scheme]").content, cs:getComputedStyle(document.documentElement).colorScheme, bg:getComputedStyle(document.body).backgroundColor, stored:localStorage.getItem("color-scheme"), checked:[...document.querySelectorAll("input[name=color-scheme]")].filter(i=>i.checked).map(i=>i.value)}))()'`. `meta` is `dark`, `light`, or `light dark`; `cs` is the mirrored `color-scheme`; `stored` is `localStorage["color-scheme"]`.
- **Dark theme.** Run `agent-browser click '.theme-btn input[value="dark"]'`, then the helper. `meta` is `dark`, `cs` is `dark`, `bg` is `rgb(12, 10, 9)`, `stored` is `dark`, and `checked` is `["dark"]`.
- **Persistence.** Run `agent-browser open "$BASE_URL/posts"` then repeat the helper. All values are unchanged: the inline `<head>` script applies `localStorage["color-scheme"]` to the `<meta>` before first paint.
- **Light theme.** Run `agent-browser click '.theme-btn input[value="light"]'`, then the helper. `meta` is `light`, `cs` is `light`, `bg` is `rgb(250, 250, 249)`, `stored` is `light`.
- **System theme.** Run `agent-browser set media light`, then `agent-browser click '.theme-btn input[value="system"]'`. The helper reports `meta` `light dark`, no stored value, `checked` `["system"]`, and a light `bg`. Run `agent-browser set media dark`; `meta` stays `light dark` while `bg` becomes `rgb(12, 10, 9)`, because the page follows the media query.
- **Header cycle.** Start from `システム` with `agent-browser set media light`, so nothing is stored and the page renders light. Run `agent-browser click '.header-theme'` and the helper: the target is dark, which differs from the system preference, so `stored` becomes `dark` and `meta` `dark`; `aria-label` reads `ライトモードに切り替える`. Click again: the target is light, which matches the system preference, so the stored value is removed, `meta` returns to `light dark`, and the page follows the system again. Note that the header button is a two-state control and never reaches the explicit `light`/`dark` state that equals the system preference.
- **Theme proof.** After the dark-mode step, run `agent-browser screenshot "$EVIDENCE_DIR/theme-dark.png" --full` and `agent-browser snapshot -i --urls > "$RUN_DIR/evidence/theme-dark.aria.txt"`. Use `$EVIDENCE_DIR/theme-system.png` / `theme-system.aria.txt` after the system-preference step.

## Gotchas

- Theme controls are at the bottom of long pages; the browser driver scrolls them into view automatically. Do not click by coordinates.
- `システム` removes `localStorage["color-scheme"]`. Under a dark OS/browser preference the page still renders dark; that is not a failure.
- No theme class is added to `document.documentElement`. The scheme lives in `<meta name="color-scheme">`, mirrored onto the `color-scheme` property by a `:root:has(> head > meta[...])` rule; `light-dark()` resolves the tokens. Assert the meta, `color-scheme`, `localStorage`, and a computed color.
- Browsers without `light-dark()` or `:has()` get a media-query fallback and the theme controls are `display: none`; the radio inputs would then be absent from the accessibility tree. If they are missing, record the engine rather than marking the journey failed.
- Theme state belongs to the isolated browser profile, not D1. No content mutation is expected.
- If the footer does not contain `プライバシーポリシー`, the seeded `pages` entry is missing or the footer pages query changed. Record the failed precondition; do not substitute a direct `/pages/privacy-policy` visit and call the footer entry verified.
- The privacy page contains external advertising and opt-out links. Do not follow them as part of this local UI journey.
