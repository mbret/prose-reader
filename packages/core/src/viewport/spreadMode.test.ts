import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { isSpreadAllowedByBook } from "../manifest/isSpreadAllowedByBook"
import type { CoreInputSettings } from "../settings/types"
import { shouldUseSpreadModeForViewport } from "./spreadMode"

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

const landscape = { height: 400, width: 800 }
const portrait = { height: 800, width: 400 }

describe(`shouldUseSpreadModeForViewport`, () => {
  it(`follows the rendition spread rules for the viewport's orientation when the setting is auto`, () => {
    expect(
      shouldUseSpreadModeForViewport({
        spreadMode: `auto`,
        manifest: createManifest({ renditionSpread: `auto` }),
        viewport: landscape,
      }),
    ).toBe(true)

    expect(
      shouldUseSpreadModeForViewport({
        spreadMode: `auto`,
        manifest: createManifest({ renditionSpread: `auto` }),
        viewport: portrait,
      }),
    ).toBe(false)

    expect(
      shouldUseSpreadModeForViewport({
        spreadMode: `auto`,
        manifest: createManifest({ renditionSpread: `portrait` }),
        viewport: portrait,
      }),
    ).toBe(true)

    expect(
      shouldUseSpreadModeForViewport({
        spreadMode: `auto`,
        manifest: createManifest({ renditionSpread: `none` }),
        viewport: landscape,
      }),
    ).toBe(false)
  })

  it(`never spreads scrolled-continuous content`, () => {
    expect(
      shouldUseSpreadModeForViewport({
        spreadMode: `auto`,
        manifest: createManifest({ renditionFlow: `scrolled-continuous` }),
        viewport: landscape,
      }),
    ).toBe(false)
  })

  it(`shows a spread in every orientation when the setting is always`, () => {
    for (const viewport of [landscape, portrait]) {
      expect(
        shouldUseSpreadModeForViewport({
          spreadMode: `always`,
          manifest: createManifest({ renditionSpread: `landscape` }),
          viewport,
        }),
      ).toBe(true)
    }
  })

  it(`does not spread a book whose rendition spread is none, even when the setting is always`, () => {
    for (const viewport of [landscape, portrait]) {
      expect(
        shouldUseSpreadModeForViewport({
          spreadMode: `always`,
          manifest: createManifest({ renditionSpread: `none` }),
          viewport,
        }),
      ).toBe(false)
    }
  })

  it(`never shows a spread when the setting is never, whatever the book's rendition spread`, () => {
    for (const viewport of [landscape, portrait]) {
      expect(
        shouldUseSpreadModeForViewport({
          spreadMode: `never`,
          manifest: createManifest({ renditionSpread: `both` }),
          viewport,
        }),
      ).toBe(false)
    }
  })

  it(`does not spread scrolled-continuous content even when the setting is always`, () => {
    expect(
      shouldUseSpreadModeForViewport({
        spreadMode: `always`,
        manifest: createManifest({ renditionFlow: `scrolled-continuous` }),
        viewport: landscape,
      }),
    ).toBe(false)
  })
})

describe(`isSpreadAllowedByBook`, () => {
  const flows: Manifest["renditionFlow"][] = [
    undefined,
    `auto`,
    `paginated`,
    `scrolled-doc`,
    `scrolled-continuous`,
  ]
  const spreadModes: CoreInputSettings["spreadMode"][] = [
    `auto`,
    `always`,
    `never`,
  ]
  const spreads: Manifest["renditionSpread"][] = [
    undefined,
    `auto`,
    `landscape`,
    `portrait`,
    `both`,
    `none`,
  ]

  it(`is true exactly when some setting and viewport show the book in a spread`, () => {
    for (const renditionFlow of flows) {
      for (const renditionSpread of spreads) {
        const manifest = createManifest({ renditionFlow, renditionSpread })
        const someSpread = spreadModes.some((spreadMode) =>
          [landscape, portrait].some((viewport) =>
            shouldUseSpreadModeForViewport({
              spreadMode,
              manifest,
              viewport,
            }),
          ),
        )

        expect(
          isSpreadAllowedByBook(manifest),
          `flow ${renditionFlow}, spread ${renditionSpread}`,
        ).toBe(someSpread)
      }
    }
  })

  it(`does not allow a book that asks for no spread, or scrolls continuously`, () => {
    expect(
      isSpreadAllowedByBook(createManifest({ renditionSpread: `none` })),
    ).toBe(false)
    expect(
      isSpreadAllowedByBook(
        createManifest({ renditionFlow: `scrolled-continuous` }),
      ),
    ).toBe(false)
  })
})
