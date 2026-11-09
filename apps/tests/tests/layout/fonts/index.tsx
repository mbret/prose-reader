import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

/**
 * A reflowable book, so a spec can change the settings that decide how many
 * pages a chapter takes. With `sansSerif` in the URL, its text is set in the
 * system sans-serif font (see `server/serveBooks.ts`).
 */
async function run() {
  const query = new URLSearchParams(window.location.search)
  const book = await openFixtureBook(
    query.has("sansSerif")
      ? "accessible_epub_3-sans-serif.epub"
      : "accessible_epub_3.epub",
  )

  const reader = createReader({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error read by the spec
  window.reader = reader
}

run()
