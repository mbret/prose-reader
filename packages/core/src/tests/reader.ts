import {
  BehaviorSubject,
  EMPTY,
  filter,
  firstValueFrom,
  Subject,
  timeout,
} from "rxjs"
import { afterEach, vi } from "vitest"
import { navigationEnhancer } from "../enhancers/navigation"
import { mockSpineItemsLayout } from "../navigation/tests/utils"
import { type CreateReaderOptions, createReader } from "../reader"
import type { PagesState } from "../spine/Pages"
import { Spine } from "../spine/Spine"
import { SpineItemPageSpineLayout } from "../spine/types"
import { SpineItemPageLayout, SpineItemPosition } from "../spineItem/types"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../tests/utils"

export const cleanups: (() => void)[] = []
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => {
      cleanup()
    })
  vi.restoreAllMocks()
})

export const setup = (options: Partial<CreateReaderOptions> = {}) => {
  const layout$ = new Subject<PagesState>()
  vi.spyOn(Spine.prototype, "layout$", "get").mockReturnValue(layout$)
  const reader = navigationEnhancer((options: CreateReaderOptions) => ({
    ...createReader(options),
    links$: EMPTY,
  }))({
    manifest: createTestManifest({
      spineItems: createTestManifestSpineItems([
        { href: "https://example.com/one.xhtml" },
        { href: "https://example.com/two.xhtml" },
      ]),
    }),
    ...options,
  })
  cleanups.push(() => reader.destroy())
  vi.spyOn(reader.viewport.value.element, "clientWidth", "get").mockReturnValue(
    50,
  )
  vi.spyOn(
    reader.viewport.value.element,
    "clientHeight",
    "get",
  ).mockReturnValue(100)
  reader.viewport.layout()
  mockSpineItemsLayout(100, reader.spine, reader.spineItemsManager)
  vi.spyOn(
    reader.spine.pages.spineLayout,
    "getSpineItemSpineLayoutInfo",
  ).mockImplementation((item) => reader.spine.getSpineItemSpineLayoutInfo(item))
  const frames = reader.spineItemsManager.items.map((item) => {
    vi.spyOn(item, "numberOfPages", "get").mockReturnValue(2)
    const frame = document.createElement("iframe")
    document.body.appendChild(frame)
    cleanups.push(() => frame.remove())
    const doc = frame.contentDocument
    if (!doc) throw new Error("Expected frame document")
    doc.body.innerHTML =
      '<p id="start">First page</p><p id="target">Second page</p>'
    vi.spyOn(item.renderer, "getDocumentFrame").mockReturnValue(frame)
    let ready = false
    const ready$ = new BehaviorSubject(false)
    vi.spyOn(item, "value", "get").mockImplementation(() => ({
      isLoaded: ready,
      isReady: ready,
      isDirty: false,
      isError: false,
      error: undefined,
    }))
    vi.spyOn(item, "isReady$", "get").mockReturnValue(ready$)
    return {
      doc,
      load: () => {
        ready = true
        ready$.next(true)
      },
    }
  })
  const nodeNavigation = vi
    .spyOn(
      reader.navigation.navigationResolver.spineItemNavigator,
      "getNavigationFromNode",
    )
    .mockImplementation(
      (_item, node) =>
        new SpineItemPosition({
          x:
            node.parentElement?.id === "target" ||
            (node.nodeType === 1 && node.textContent === "Second page")
              ? 50
              : 0,
          y: 0,
        }),
    )
  vi.spyOn(reader.spine.pages, "fromSpineItemPageIndex").mockImplementation(
    (item, pageIndex) => {
      const index = typeof item === "number" ? item : item.index
      const frame = frames[index]
      const node = frame?.doc.getElementById(
        pageIndex ? "target" : "start",
      )?.firstChild
      return {
        pageIndex,
        itemIndex: index,
        absolutePageIndex: index * 2 + pageIndex,
        firstVisibleNode: node ? { node, offset: 0 } : undefined,
        layout: new SpineItemPageLayout({
          x: 0,
          y: 0,
          left: 0,
          right: 50,
          top: 0,
          bottom: 100,
          width: 50,
          height: 100,
        }),
        absoluteLayout: new SpineItemPageSpineLayout({
          x: 0,
          y: 0,
          left: 0,
          right: 50,
          top: 0,
          bottom: 100,
          width: 50,
          height: 100,
        }),
      }
    },
  )
  const relayout = () => layout$.next({ pages: [] })
  const load = (index: number) => {
    frames[index]?.load()
    relayout()
  }
  const settled = () =>
    firstValueFrom(
      reader.navigation.settled$.pipe(filter(Boolean), timeout(1000)),
    )
  return {
    reader,
    frames,
    load,
    relayout,
    settled,
    nodeNavigation,
  }
}
