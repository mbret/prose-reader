import { firstValueFrom, of } from "rxjs"
import { describe, expect, it } from "vitest"
import type { CfiManager } from "../../cfi"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry } from "../types"
import { withAnchor } from "./withAnchor"

const itemStart = "epubcfi(/6/2[0]!)"
const pageText = "epubcfi(/6/2[0]!/4/2/1:0)"
const textElsewhere = "epubcfi(/6/2[0]!/4/8/1:0)"

/**
 * The spine and pages this step reads, held in whatever state a test needs:
 * a layout pending or current, an item ready or not. The page at any position
 * has a first visible node, so only the step's own guards can keep it from
 * being read.
 */
const createSpine = ({
  isLayoutCurrent = true,
  isReady = true,
}: {
  isLayoutCurrent?: boolean
  isReady?: boolean
} = {}) => {
  const item = { index: 0 }
  const spine = {
    isLayoutCurrent,
    spineItemsManager: {
      get: () => ({ item, value: { isReady } }),
    },
    locator: {
      getVisibleSpineItemsFromPosition: () => ({
        beginIndex: 0,
        endIndex: 0,
      }),
      getVisiblePagesFromViewportPosition: () => ({
        beginPageIndex: 0,
        endPageIndex: 0,
      }),
    },
    pages: {
      fromSpineItemPageIndex: () => ({
        firstVisibleNode: { node: {}, offset: 0 },
      }),
    },
  }
  const cfi = {
    generateCfiForPage: () => pageText,
  }

  return {
    // The step only reads the members above, so a partial spine and cfi
    // manager stand in for the real ones.
    spine: spine as unknown as Spine,
    cfi: cfi as unknown as CfiManager,
  }
}

const anchorOf = (
  navigation: Partial<InternalNavigationEntry>,
  context: ReturnType<typeof createSpine>,
  { awaitsDocument = false }: { awaitsDocument?: boolean } = {},
) =>
  firstValueFrom(
    of({
      awaitsDocument,
      navigation: {
        target: { type: "position", value: { x: 0, y: 0 } },
        position: { x: 0, y: 0 },
        spineItem: 0,
        ...navigation,
        // A navigation entry carries far more; the step reads only these.
      } as InternalNavigationEntry,
    }).pipe(withAnchor(context)),
  ).then(({ navigation }) => navigation.anchor)

describe("withAnchor", () => {
  it("is the first character of the page at the navigation's position", async () => {
    expect(await anchorOf({}, createSpine())).toBe(pageText)
  })

  it("has none while a layout is pending, rather than a page of the one being replaced", async () => {
    /**
     * Pages are published a few frames after a layout pass. Until then they
     * still describe the layout being replaced, while positions already
     * follow the new one: the page they give for a position holds other text.
     */
    expect(
      await anchorOf({}, createSpine({ isLayoutCurrent: false })),
    ).toBeUndefined()
  })

  it("has none while the item is not ready", async () => {
    expect(await anchorOf({}, createSpine({ isReady: false }))).toBeUndefined()
  })

  it("has none while its target waits for a document, even with a page laid out at its position", async () => {
    /**
     * The page that shows first at the start of an item not loaded yet can be
     * another item's. Taking its text would stop the target from being
     * resolved once its own item loads.
     */
    expect(
      await anchorOf({}, createSpine(), { awaitsDocument: true }),
    ).toBeUndefined()
  })

  it("keeps a position in the text for the rest of the navigation", async () => {
    /**
     * A restoration lands on the page holding the position. Taking that
     * page's own first character would restore to the page before at the
     * next relayout.
     */
    expect(await anchorOf({ anchor: textElsewhere }, createSpine())).toBe(
      textElsewhere,
    )
  })

  it("keeps a position found on a page without text, rather than finding it again", async () => {
    /**
     * A pre-paginated page has no first visible character, so its position is
     * its item. Finding it again at every restoration would follow the
     * spread: after a rotation the page shown first can be the other one.
     */
    expect(await anchorOf({ anchor: itemStart }, createSpine())).toBe(itemStart)
  })
})
