/* @vitest-environment happy-dom */

import type { ExtraPaginationInfo, PaginationInfo } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import {
  getSpreadRotationHintTargetKey,
  wouldRotationUseComputedSpreadMode,
} from "./SpreadRotationHint"

const createSpineItem = (
  id: string,
  index: number,
): Manifest["spineItems"][number] => ({
  href: `${id}.xhtml`,
  id,
  index,
  mediaType: `application/xhtml+xml`,
  renditionLayout: `pre-paginated`,
})

const createManifest = (
  spineItems: Manifest["spineItems"],
  overrides: Partial<Pick<Manifest, "renditionFlow" | "renditionSpread">> = {},
): Manifest => ({
  filename: `book.epub`,
  items: [],
  readingDirection: `ltr`,
  renditionFlow: `paginated`,
  renditionLayout: `pre-paginated`,
  renditionSpread: `auto`,
  spineItems,
  title: `Book`,
  ...overrides,
})

const createPagination = (
  index: number,
): PaginationInfo & ExtraPaginationInfo => ({
  beginAbsolutePageIndex: 0,
  beginCfi: undefined,
  beginChapterInfo: undefined,
  beginHasAdjacentSpreadPage: true,
  beginNumberOfPagesInSpineItem: 1,
  beginPageIndexInSpineItem: 0,
  beginSpineItemReadingDirection: `ltr`,
  beginSpineItemIndex: index,
  endAbsolutePageIndex: 0,
  endCfi: undefined,
  endChapterInfo: undefined,
  endHasAdjacentSpreadPage: false,
  endNumberOfPagesInSpineItem: 1,
  endPageIndexInSpineItem: 0,
  endSpineItemReadingDirection: `ltr`,
  endSpineItemIndex: index,
  isUsingSpread: false,
  numberOfTotalPages: 1,
  percentageEstimateOfBook: 0,
})

describe(`SpreadRotationHint`, () => {
  it(`mirrors auto-spread conditions when checking a rotation`, () => {
    const manifest = createManifest([createSpineItem(`page`, 0)])

    expect(
      wouldRotationUseComputedSpreadMode({
        manifest,
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(true)
    expect(
      wouldRotationUseComputedSpreadMode({
        manifest: createManifest(manifest.spineItems, {
          renditionSpread: `none`,
        }),
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(false)
    expect(
      wouldRotationUseComputedSpreadMode({
        manifest: createManifest(manifest.spineItems, {
          renditionFlow: `scrolled-continuous`,
        }),
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(false)
  })

  it(`returns a target key only when the current page can become a spread after rotation`, () => {
    const manifest = createManifest([
      createSpineItem(`left`, 0),
      createSpineItem(`right`, 1),
    ])

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        computedSpreadMode: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(`0:0:0:0`)

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        computedSpreadMode: true,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
      }),
    ).toBeUndefined()

    expect(
      getSpreadRotationHintTargetKey({
        manifest: createManifest(manifest.spineItems, {
          renditionSpread: `none`,
        }),
        pagination: createPagination(0),
        computedSpreadMode: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
      }),
    ).toBeUndefined()

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: {
          ...createPagination(0),
          beginHasAdjacentSpreadPage: false,
        },
        computedSpreadMode: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
      }),
    ).toBeUndefined()

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        computedSpreadMode: false,
        viewportState: `busy`,
        viewport: { height: 800, width: 400 },
      }),
    ).toBeUndefined()
  })
})
