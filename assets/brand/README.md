# prose brand

The prose mark is a pilcrow, the paragraph sign, on a page whose corner is
turning. It is drawn on a 32-unit grid, so its straight edges fall on whole
pixels at 16 and 32 px.

| File | Use |
| --- | --- |
| `logo.svg` | The mark, and the source of every icon below |
| `logo-wordmark.svg` | The mark beside the name, on light backgrounds |
| `logo-wordmark-dark.svg` | The mark beside the name, on dark backgrounds |
| `logo-512.png` | The mark as a 512 px PNG, where an SVG is not accepted |
| `social-card.html` | The source of the website's link preview, see below |

## Colors

- Page: `#E5482B`
- Page underneath the turned corner: `#993723`
- Pilcrow and turned corner: `#FBF7EF`
- Name on light backgrounds: `#1C1A17`

The name is set in [Literata](https://github.com/googlefonts/literata)
SemiBold, under the SIL Open Font License, and converted to outlines, so the
wordmarks render without the font.

## Copies served by the apps

`apps/front/public/` and `apps/docs/public/` each serve the mark as
`favicon.svg`, `favicon.ico` and `apple-touch-icon.png`, and the docs header
shows `apps/docs/src/assets/logo.svg`. Update them when the mark changes:

- `favicon.svg` and the docs `logo.svg` are copies of `logo.svg`.
- `favicon.ico` holds 16, 32 and 48 px renders of `logo.svg`.
- `apple-touch-icon.png` is a 180 px render of the mark without its rounded
  corners, which iOS draws itself.

The landing page's header and footer import `logo.svg` itself, so they follow
the mark without a copy.

`apps/front/public/social-card.jpg` is the website's link preview, 1200 × 630
px: the mark and the name, the landing page's headline and the demo in a browser
and on a phone, as in the landing page's hero. `social-card.html` is its source,
which loads the fonts from `apps/front/node_modules` and the screenshots from
the landing page's assets. Render it again when the mark, the headline or the
hero changes, with the browsers of the browser tests, and keep the JPEG under
300 KB, the most some link previews, such as WhatsApp's, accept:

```sh
pnpm --filter prose-reader-tests exec playwright screenshot --viewport-size=1200,630 \
  "file://$PWD/assets/brand/social-card.html" "$PWD/apps/front/public/social-card.jpg"
```
