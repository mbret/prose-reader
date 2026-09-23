/* @vitest-environment happy-dom */

import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import {
  getSpreadRotationHintTargetKey,
  wouldRotationUseSpreadMode,
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

const createPagination = (index: number) => ({
  beginPageIndexInSpineItem: 0,
  beginSpineItemIndex: index,
  endPageIndexInSpineItem: 0,
  endSpineItemIndex: index,
})

describe(`SpreadRotationHint`, () => {
  it(`mirrors auto-spread conditions when checking a rotation`, () => {
    const manifest = createManifest([createSpineItem(`page`, 0)])

    expect(
      wouldRotationUseSpreadMode({
        spreadMode: `auto`,
        manifest,
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(true)
    expect(
      wouldRotationUseSpreadMode({
        spreadMode: `auto`,
        manifest: createManifest(manifest.spineItems, {
          renditionSpread: `none`,
        }),
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(false)
    expect(
      wouldRotationUseSpreadMode({
        spreadMode: `auto`,
        manifest: createManifest(manifest.spineItems, {
          renditionFlow: `scrolled-continuous`,
        }),
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(false)
  })

  it(`returns a target key only when the current page is a panorama half that can become a spread after rotation`, () => {
    const manifest = createManifest([
      createSpineItem(`left`, 0),
      createSpineItem(`right`, 1),
    ])

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        spreadMode: `auto`,
        isSpread: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
        isPanorama: true,
      }),
    ).toBe(`0:0:0:0`)

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        spreadMode: `auto`,
        isSpread: true,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
        isPanorama: true,
      }),
    ).toBeUndefined()

    expect(
      getSpreadRotationHintTargetKey({
        manifest: createManifest(manifest.spineItems, {
          renditionSpread: `none`,
        }),
        pagination: createPagination(0),
        spreadMode: `auto`,
        isSpread: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
        isPanorama: true,
      }),
    ).toBeUndefined()

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        spreadMode: `auto`,
        isSpread: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
        isPanorama: false,
      }),
    ).toBeUndefined()

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        spreadMode: `auto`,
        isSpread: false,
        viewportState: `busy`,
        viewport: { height: 800, width: 400 },
        isPanorama: true,
      }),
    ).toBeUndefined()
  })

  it(`does not hint at a rotation when the spreadMode setting keeps spreads off`, () => {
    const manifest = createManifest([
      createSpineItem(`left`, 0),
      createSpineItem(`right`, 1),
    ])

    expect(
      getSpreadRotationHintTargetKey({
        manifest,
        pagination: createPagination(0),
        spreadMode: `never`,
        isSpread: false,
        viewportState: `free`,
        viewport: { height: 800, width: 400 },
        isPanorama: true,
      }),
    ).toBeUndefined()
  })
})
