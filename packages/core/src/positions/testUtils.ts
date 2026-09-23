import type { PositionFormat } from "@prose-reader/shared/positions"
import {
  BehaviorSubject,
  EMPTY,
  filter,
  firstValueFrom,
  map,
  merge,
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

/**
 * A reader over two reflowable items of two pages each, whose documents,
 * readiness and layout are held by the test: `load` makes an item ready and
 * lays the spine out, `relayout` lays it out again. A `test` position format
 * addresses the paragraphs of those documents as `item:<index>#<id>`.
 *
 * The spine's own layout passes still run, a mount requests one for example,
 * and they still make the layout stale until they land. Their completion is
 * published alongside the test's layouts, so pagination resolves again once
 * the layout is current, as it does outside the fixture.
 */

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

const createReaderFixture = (options: Partial<CreateReaderOptions> = {}) => {
  const layout$ = new Subject<PagesState>()
  vi.spyOn(Spine.prototype, "layout$", "get").mockImplementation(function (
    this: Spine,
  ) {
    return merge(layout$, this.pages.layout$)
  })
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
      const layout = {
        x: 0,
        y: 0,
        left: 0,
        right: 50,
        top: 0,
        bottom: 100,
        width: 50,
        height: 100,
      }
      return {
        pageIndex,
        itemIndex: index,
        absolutePageIndex: index * 2 + pageIndex,
        firstVisibleNode: node ? { node, offset: 0 } : undefined,
        layout: new SpineItemPageLayout(layout),
        absoluteLayout: new SpineItemPageSpineLayout(layout),
      }
    },
  )
  const relayout = () => layout$.next({ pages: [] })
  const load = (index: number) => {
    frames[index]?.load()
    relayout()
  }
  /**
   * Whether the reader's pagination result is settled. A navigation or a
   * layout withdraws settlement synchronously, so waiting for the next settled
   * result right after either waits for that request's result.
   */
  const isSettled$ = reader.pagination.state$.pipe(
    map((state) => state.isSettled),
  )
  const settled = () =>
    firstValueFrom(isSettled$.pipe(filter(Boolean), timeout(1000)))

  return {
    reader,
    frames,
    load,
    relayout,
    isSettled$,
    settled,
    nodeNavigation,
  }
}

export const setup = (options: Partial<CreateReaderOptions> = {}) => {
  const fixture = createReaderFixture(options)
  const { reader } = fixture
  const resolve = vi.fn<PositionFormat["resolve"]>((value, { document }) => {
    const node = document.getElementById(value.split("#")[1] ?? "")?.firstChild
    return node ? { node, offset: 0 } : undefined
  })
  const generate = vi.fn<PositionFormat["generate"]>(
    (position, { spineItem }) =>
      `item:${spineItem.index}#${position.node.parentElement?.id}`,
  )
  const format: PositionFormat = {
    name: "test",
    spineItemIndexOf: (value) =>
      /^item:\d+#/.test(value)
        ? Number(value.split(":")[1]?.split("#")[0])
        : undefined,
    resolve,
    generate,
  }
  const unregister = reader.positions.register(format)
  return { ...fixture, resolve, generate, unregister }
}
