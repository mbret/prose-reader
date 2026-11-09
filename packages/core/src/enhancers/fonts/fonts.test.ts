import { filter, firstValueFrom, timeout } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import type { SpineItem } from "../../spineItem/SpineItem"
import {
  createFullTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
} from "../../tests/readerHarness"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"
import type { EnhancerFontsInputSettings } from "./types"

installReaderTestEnvironment()

/** The fonts stylesheet of an item's document, as it is now. */
const getFontsStylesheet = (item: SpineItem) =>
  item.renderer
    .getDocumentFrame()
    ?.contentDocument?.getElementById(`prose-reader-fonts`)?.textContent ??
  undefined

/**
 * A reader of one text document, and the fonts stylesheet that document has
 * each time its renderer starts a layout once it is loaded: what the layout
 * measures.
 */
const createReaderOfOneDocument = ({
  renditionLayout = `reflowable`,
  ...settings
}: Partial<EnhancerFontsInputSettings> & {
  renditionLayout?: `reflowable` | `pre-paginated`
} = {}) => {
  const reader = createFullTestReader({
    getRenderer: renderTextDocuments,
    manifest: createTestManifest({
      spineItems: createTestManifestSpineItems([{ renditionLayout }]),
    }),
    ...settings,
  })
  const [item] = reader.spineItemsManager.items

  if (!item) throw new Error(`the reader has no item`)

  const stylesheetsAtLayout: (string | undefined)[] = []
  const layOut = item.renderer.layout.bind(item.renderer)

  vi.spyOn(item.renderer, `layout`).mockImplementation((params) => {
    if (item.loadedDocument) stylesheetsAtLayout.push(getFontsStylesheet(item))

    return layOut(params)
  })

  mountTestReader(reader)

  const isReady = firstValueFrom(
    item.isReady$.pipe(filter(Boolean), timeout(2000)),
  )

  return { reader, item, stylesheetsAtLayout, isReady }
}

/**
 * A changed value of each fonts setting, and the declaration it writes. A
 * new fonts setting needs a row here.
 */
const changes: {
  [Key in keyof EnhancerFontsInputSettings]: {
    settings: Pick<EnhancerFontsInputSettings, Key>
    declaration: string
  }
} = {
  fontScale: { settings: { fontScale: 2 }, declaration: `font-size: 2em` },
  lineHeight: { settings: { lineHeight: 2 }, declaration: `line-height: 2` },
  fontWeight: {
    settings: { fontWeight: 900 },
    declaration: `font-weight: 900`,
  },
  fontJustification: {
    settings: { fontJustification: `justify` },
    declaration: `text-align: justify`,
  },
}

describe(`Given a reflowable document`, () => {
  it(`styles it with the settings the reader starts with, before its first layout`, async () => {
    const { stylesheetsAtLayout, isReady } = createReaderOfOneDocument({
      fontWeight: 700,
    })

    await isReady

    expect(stylesheetsAtLayout[0]).toContain(`font-weight: 700`)
  })

  describe.each(Object.entries(changes))(`when %s changes`, (_, change) => {
    it(`lays the book out once, and the layout measures the document styled for the new value`, async () => {
      const { reader, stylesheetsAtLayout, isReady } =
        createReaderOfOneDocument()

      await isReady

      let layouts = 0

      reader.viewport.layout$.subscribe(() => {
        layouts += 1
      })

      reader.settings.update(change.settings)

      expect(layouts).toBe(1)

      await firstValueFrom(reader.layout$.pipe(timeout(2000)))

      expect(stylesheetsAtLayout.at(-1)).toContain(change.declaration)
    })
  })

  it(`does not lay the book out for a setting of another enhancer`, async () => {
    const { reader, isReady } = createReaderOfOneDocument()

    await isReady

    let layouts = 0

    reader.viewport.layout$.subscribe(() => {
      layouts += 1
    })

    reader.settings.update({ layoutLayerTransition: true })

    expect(layouts).toBe(0)
  })
})

/**
 * A pre-paginated document is made for its fixed layout, which a font scaled
 * by the reader could break.
 */
describe(`Given a pre-paginated document`, () => {
  it(`leaves it without the fonts stylesheet`, async () => {
    const { item, stylesheetsAtLayout, isReady } = createReaderOfOneDocument({
      renditionLayout: `pre-paginated`,
      fontScale: 2,
    })

    await isReady

    expect(stylesheetsAtLayout).not.toHaveLength(0)
    expect([...stylesheetsAtLayout, getFontsStylesheet(item)]).toEqual(
      Array(stylesheetsAtLayout.length + 1).fill(undefined),
    )
  })
})
