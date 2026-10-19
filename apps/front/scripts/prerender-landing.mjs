/**
 * Writes the landing page into the built index.html, so it is served as HTML
 * and React only attaches to it in the browser. Runs after `vite build`, and
 * after `vite build --ssr src/landing/prerender.tsx --outDir dist-ssr` has
 * built the renderer.
 */
import { readFile, rm, writeFile } from "node:fs/promises"

const pagePath = new URL("../dist/index.html", import.meta.url)
const rendererDirectory = new URL("../dist-ssr/", import.meta.url)

/**
 * A replacer function keeps `$` in the page, such as the install command's
 * prompt, from being read as a replacement pattern.
 */
const replaceMarker = (page, marker, content) => {
  const occurrences = page.split(marker).length - 1

  if (occurrences !== 1) {
    throw new Error(
      `Expected ${marker} once in dist/index.html, found it ${occurrences} times`,
    )
  }

  return page.replace(marker, () => content)
}

const { prerenderLanding } = await import(
  new URL("prerender.js", rendererDirectory).href
)
const { html, styles } = prerenderLanding()
const template = await readFile(pagePath, "utf8")
const page = replaceMarker(
  replaceMarker(template, "<!--landing-styles-->", styles),
  "<!--landing-html-->",
  html,
)

await writeFile(pagePath, page)
await rm(rendererDirectory, { recursive: true, force: true })
