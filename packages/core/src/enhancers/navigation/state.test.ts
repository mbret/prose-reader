import type { Manifest } from "@prose-reader/shared"
import { firstValueFrom } from "rxjs"
import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context.ts"
import { HookManager } from "../../hooks/HookManager.ts"
import { createEmptyPaginationEdge } from "../../pagination/edges.ts"
import { Pagination } from "../../pagination/Pagination.ts"
import type { Reader } from "../../reader.ts"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager.ts"
import type { CoreInputSettings } from "../../settings/types.ts"
import { SpineItemsManager } from "../../spine/SpineItemsManager.ts"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils.ts"
import { Viewport } from "../../viewport/Viewport.ts"
import { observeState } from "./state.ts"

type TestBook = {
  readingDirection: Manifest["readingDirection"]
  pageTurnDirection?: CoreInputSettings["pageTurnDirection"]
}

const createTestReader = ({
  readingDirection,
  pageTurnDirection,
}: TestBook) => {
  const context = new Context(
    createTestManifest({
      readingDirection,
      spineItems: createTestManifestSpineItems(3),
    }),
  )
  const settings = new ReaderSettingsManager(
    pageTurnDirection ? { pageTurnDirection } : {},
    context,
  )
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(
    context,
    settings,
    hookManager,
    viewport,
  )
  const pagination = new Pagination(context, spineItemsManager)

  // Cast: only the fields read by `observeState` are wired up.
  const reader = {
    pagination: { state$: pagination },
    settings,
    context,
  } as unknown as Reader

  return { reader, pagination }
}

const stateWhileShowing = (book: TestBook, spineItemIndex: number) => {
  const { reader, pagination } = createTestReader(book)

  pagination.update({
    isSettled: false,
    begin: { ...createEmptyPaginationEdge(), spineItemIndex },
    end: { ...createEmptyPaginationEdge(), spineItemIndex },
  })

  return firstValueFrom(observeState(reader))
}

describe("observeState", () => {
  describe("Given a horizontal ltr book", () => {
    const book: TestBook = { readingDirection: "ltr" }

    it("can go both ways from a middle spine item", async () => {
      expect(await stateWhileShowing(book, 1)).toEqual({
        canGoTopSpineItem: false,
        canGoBottomSpineItem: false,
        canGoLeftSpineItem: true,
        canGoRightSpineItem: true,
      })
    })

    it("cannot go left from the first spine item", async () => {
      expect(await stateWhileShowing(book, 0)).toMatchObject({
        canGoLeftSpineItem: false,
        canGoRightSpineItem: true,
      })
    })

    it("cannot go right from the last spine item", async () => {
      expect(await stateWhileShowing(book, 2)).toMatchObject({
        canGoLeftSpineItem: true,
        canGoRightSpineItem: false,
      })
    })
  })

  describe("Given a horizontal rtl book", () => {
    const book: TestBook = { readingDirection: "rtl" }

    it("goes left to the next spine item, so cannot go right from the first", async () => {
      expect(await stateWhileShowing(book, 0)).toMatchObject({
        canGoLeftSpineItem: true,
        canGoRightSpineItem: false,
      })
    })

    it("cannot go left from the last spine item", async () => {
      expect(await stateWhileShowing(book, 2)).toMatchObject({
        canGoLeftSpineItem: false,
        canGoRightSpineItem: true,
      })
    })
  })

  /**
   * The spine-item navigators treat any direction but rtl as ltr, so the state
   * has to as well, or it disables navigations that would work.
   */
  describe("Given a manifest without a reading direction", () => {
    const book: TestBook = { readingDirection: undefined }

    it("agrees with the navigators and reads it as ltr", async () => {
      expect(await stateWhileShowing(book, 0)).toMatchObject({
        canGoLeftSpineItem: false,
        canGoRightSpineItem: true,
      })
    })
  })

  describe("Given a vertical book", () => {
    const book: TestBook = {
      readingDirection: "ltr",
      pageTurnDirection: "vertical",
    }

    it("only moves top and bottom", async () => {
      expect(await stateWhileShowing(book, 0)).toEqual({
        canGoTopSpineItem: false,
        canGoBottomSpineItem: true,
        canGoLeftSpineItem: false,
        canGoRightSpineItem: false,
      })
    })

    it("cannot go bottom from the last spine item", async () => {
      expect(await stateWhileShowing(book, 2)).toMatchObject({
        canGoTopSpineItem: true,
        canGoBottomSpineItem: false,
      })
    })
  })
})
