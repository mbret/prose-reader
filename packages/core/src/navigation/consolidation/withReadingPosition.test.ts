import { firstValueFrom, of } from "rxjs"
import { describe, expect, it } from "vitest"
import type { CfiManager } from "../../cfi"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry } from "../types"
import { withReadingPosition } from "./withReadingPosition"

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
    isRootCfi: (value: string) => value.endsWith("!)"),
    generateRootCfi: () => itemStart,
    generateCfiForPage: () => pageText,
  }

  return {
    // The step only reads the members above, so a partial spine and cfi
    // manager stand in for the real ones.
    spine: spine as unknown as Spine,
    cfi: cfi as unknown as CfiManager,
  }
}

const readingPositionOf = (
  navigation: Partial<InternalNavigationEntry>,
  context: ReturnType<typeof createSpine>,
) =>
  firstValueFrom(
    of({
      navigation: {
        position: { x: 0, y: 0 },
        spineItem: 0,
        ...navigation,
        // A navigation entry carries far more; the step reads only these.
      } as InternalNavigationEntry,
    }).pipe(withReadingPosition(context)),
  ).then(({ navigation }) => navigation.readingPosition)

describe("withReadingPosition", () => {
  it("is the cfi a navigation named", async () => {
    expect(await readingPositionOf({ cfi: textElsewhere }, createSpine())).toBe(
      textElsewhere,
    )
  })

  it("is the first character of the page at the navigation's position", async () => {
    expect(await readingPositionOf({}, createSpine())).toBe(pageText)
  })

  it("is the item start while a layout is pending, not a page of the one being replaced", async () => {
    /**
     * Pages are published a few frames after a layout pass. Until then they
     * still describe the layout being replaced, while positions already
     * follow the new one: the page they give for a position holds other text.
     */
    expect(
      await readingPositionOf({}, createSpine({ isLayoutCurrent: false })),
    ).toBe(itemStart)
  })

  it("is the item start while the item is not ready", async () => {
    expect(await readingPositionOf({}, createSpine({ isReady: false }))).toBe(
      itemStart,
    )
  })

  it("keeps a position in the text for the rest of the navigation", async () => {
    /**
     * A restoration lands on the page holding the position. Taking that
     * page's own first character would restore to the page before at the
     * next relayout.
     */
    expect(
      await readingPositionOf(
        { readingPosition: textElsewhere },
        createSpine(),
      ),
    ).toBe(textElsewhere)
  })

  it("refines an item start once the page is laid out", async () => {
    expect(
      await readingPositionOf({ readingPosition: itemStart }, createSpine()),
    ).toBe(pageText)
  })
})
