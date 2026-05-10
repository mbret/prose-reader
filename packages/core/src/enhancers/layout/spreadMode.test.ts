import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import {
  shouldEnableSpreadModeForViewport,
  shouldUseComputedSpreadModeForViewport,
} from "./spreadMode"

const createManifest = (
  overrides: Partial<Pick<Manifest, "renditionFlow" | "renditionSpread">> = {},
): Manifest => ({
  filename: `book.epub`,
  items: [],
  readingDirection: `ltr`,
  renditionFlow: `paginated`,
  renditionLayout: `pre-paginated`,
  renditionSpread: `auto`,
  spineItems: [],
  title: `Book`,
  ...overrides,
})

describe(`spread mode viewport helpers`, () => {
  it(`matches rendition spread rules for the input spread mode setting`, () => {
    expect(
      shouldEnableSpreadModeForViewport({
        manifest: createManifest({ renditionSpread: `auto` }),
        viewport: { height: 400, width: 800 },
      }),
    ).toBe(true)

    expect(
      shouldEnableSpreadModeForViewport({
        manifest: createManifest({ renditionSpread: `portrait` }),
        viewport: { height: 800, width: 400 },
      }),
    ).toBe(true)

    expect(
      shouldEnableSpreadModeForViewport({
        manifest: createManifest({ renditionSpread: `none` }),
        viewport: { height: 400, width: 800 },
      }),
    ).toBe(false)
  })

  it(`applies computed spread guards after resolving the viewport rule`, () => {
    expect(
      shouldUseComputedSpreadModeForViewport({
        manifest: createManifest({ renditionFlow: `scrolled-continuous` }),
        viewport: { height: 400, width: 800 },
      }),
    ).toBe(false)
  })
})
