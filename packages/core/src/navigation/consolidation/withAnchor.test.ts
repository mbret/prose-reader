import { firstValueFrom, of } from "rxjs"
import { describe, expect, it } from "vitest"
import type { CfiManager } from "../../cfi"
import type { Context } from "../../context/Context"
import type { Spine } from "../../spine/Spine"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"
import type { InternalNavigationEntry, NavigationAnchor } from "../types"
import { withAnchor } from "./withAnchor"

const itemStart = "epubcfi(/6/2[0]!)"
const pageText = "epubcfi(/6/2[0]!/4/2/1:0)"
const textElsewhere = "epubcfi(/6/2[0]!/4/8/1:0)"

/**
 * Two items holding half the book each. The page at any position is the
 * second of the first item's four, so it starts an eighth into the book. A
 * cfi resolves onto the fourth, as the second page of a spread would.
 */
const manifest = createTestManifest({
  spineItems: createTestManifestSpineItems([
    { progressionWeight: 0.5 },
    { progressionWeight: 0.5 },
  ]),
})
const expectedPageStartProgression = 0.125
const expectedCfiPageStartProgression = 0.375

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
  const spineItem = { item, index: 0, numberOfPages: 4, value: { isReady } }
  const spine = {
    isLayoutCurrent,
    spineItemsManager: {
      get: () => spineItem,
    },
    locator: {
      getSpineItemPageIndexFromNode: () => 3,
      getVisibleSpineItemsFromPosition: () => ({
        beginIndex: 0,
        endIndex: 0,
      }),
      getVisiblePagesFromViewportPosition: () => ({
        beginPageIndex: 1,
        endPageIndex: 1,
      }),
    },
    pages: {
      fromSpineItemPageIndex: () => ({
        pageIndex: 1,
        firstVisibleNode: { node: {}, offset: 0 },
      }),
    },
  }
  const cfi = {
    generateCfiForPage: () => pageText,
    resolveCfi: () => ({ node: {}, offset: 0, spineItem }),
  }

  return {
    // The step only reads the members above, so a partial spine, cfi manager
    // and context stand in for the real ones.
    spine: spine as unknown as Spine,
    cfi: cfi as unknown as CfiManager,
    context: { manifest } as unknown as Context,
  }
}

const consolidateAnchor = (
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
  it("is the first character of the page at the navigation's position, and where that page starts in the book", async () => {
    expect(await consolidateAnchor({}, createSpine())).toEqual({
      cfi: pageText,
      isFinal: true,
      pageStartProgression: expectedPageStartProgression,
    })
  })

  it("has none while a layout is pending, rather than a page of the one being replaced", async () => {
    /**
     * Pages are published a few frames after a layout pass. Until then they
     * still describe the layout being replaced, while positions already
     * follow the new one: the page they give for a position holds other text.
     */
    expect(
      await consolidateAnchor({}, createSpine({ isLayoutCurrent: false })),
    ).toBeUndefined()
  })

  it("has none while the item is not ready", async () => {
    expect(
      await consolidateAnchor({}, createSpine({ isReady: false })),
    ).toBeUndefined()
  })

  it("has none while its target waits for a document, even with a page laid out at its position", async () => {
    /**
     * The page that shows first at the start of an item not loaded yet can be
     * another item's. Taking its text would stop the target from being
     * resolved once its own item loads.
     */
    expect(
      await consolidateAnchor({}, createSpine(), { awaitsDocument: true }),
    ).toBeUndefined()
  })

  it("keeps a final position in the text for the rest of the navigation", async () => {
    /**
     * A restoration lands on the page holding the position. Taking that
     * page's own first character would restore to the page before at the
     * next relayout.
     */
    const anchor: NavigationAnchor = {
      cfi: textElsewhere,
      isFinal: true,
      pageStartProgression: 0.25,
    }

    expect(await consolidateAnchor({ anchor }, createSpine())).toEqual(anchor)
  })

  it("keeps a position found on a page without text, rather than finding it again", async () => {
    /**
     * A pre-paginated page has no first visible character, so its position is
     * its item. Finding it again at every restoration would follow the
     * spread: after a rotation the page shown first can be the other one.
     */
    const anchor: NavigationAnchor = {
      cfi: itemStart,
      isFinal: true,
      pageStartProgression: 0,
    }

    expect(await consolidateAnchor({ anchor }, createSpine())).toEqual(anchor)
  })

  it("makes a target's position final once its page is laid out, with where that page is in the book", async () => {
    /**
     * A cfi target names its position before its item is laid out, when
     * nothing tells how far into the book the page holding it is. The first
     * consolidation that lands on that page finds it, from the page the cfi
     * resolves to: the navigation's position is a spread's first page, and
     * the cfi can be on the second.
     */
    const targetAnchor: NavigationAnchor = {
      cfi: textElsewhere,
      isFinal: false,
    }

    expect(
      await consolidateAnchor(
        { anchor: targetAnchor },
        createSpine({ isReady: false }),
      ),
    ).toEqual(targetAnchor)
    expect(
      await consolidateAnchor({ anchor: targetAnchor }, createSpine()),
    ).toEqual({
      cfi: textElsewhere,
      isFinal: true,
      pageStartProgression: expectedCfiPageStartProgression,
    })
  })
})
