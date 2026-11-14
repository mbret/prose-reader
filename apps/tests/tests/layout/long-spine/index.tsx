import { createReader } from "@prose-reader/core"
import { openFixtureBook } from "../../fixtureBook"

async function run() {
  // `server/serveBooks.ts` makes the book.
  const book = await openFixtureBook("long-comic.cbz")

  const reader = createReader({
    ...book,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
  })

  /**
   * What happened to each page from the mount on, read by the spec: the
   * layouts of the page, and whether its load started. Recorded before the
   * mount, which starts the first layout.
   */
  const pagesFromMount = reader.spineItemsManager.items.map(() => ({
    layouts: 0,
    hasStartedLoading: false,
  }))

  reader.hookManager.register("item.onBeforeLayout", ({ item }) => {
    const page = pagesFromMount[item.index]

    if (page) page.layouts += 1
  })
  reader.spineItemsManager.items.forEach((item) => {
    item.watch("loadStatus").subscribe((loadStatus) => {
      const page = pagesFromMount[item.index]

      if (page && loadStatus !== "idle") page.hasStartedLoading = true
    })
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error read by the spec
  window.reader = reader
  // @ts-expect-error read by the spec
  window.pagesFromMount = pagesFromMount
}

run()
