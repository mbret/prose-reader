import { describe, expect, it, vi } from "vitest"
import {
  createFullTestReader,
  installReaderTestEnvironment,
  mountTestReader,
} from "../tests/readerHarness"

installReaderTestEnvironment()

/**
 * Settings of the core reader, of the layout enhancer and of the fonts
 * enhancer: three layers of the reader's settings, from the innermost.
 */
type FullTestReaderSettings = Parameters<
  ReturnType<typeof createFullTestReader>["settings"]["update"]
>[0]

const updatesAcrossLayers: FullTestReaderSettings[] = [
  { spreadMode: `auto` },
  { spreadMode: `never` },
  { fontScale: 1.5 },
  { pageHorizontalMargin: 10, spreadMode: `always` },
  { layoutLayerTransition: false, fontScale: 2 },
  { pageTurnAnimation: `none`, pageVerticalMargin: 12, lineHeight: 1.4 },
  { fontScale: 2 },
  { spreadMode: `auto` },
]

describe("the reader's settings", () => {
  it("emit the values they hold after every update", () => {
    const reader = createFullTestReader()
    const onValues = vi.fn()

    reader.settings.values$.subscribe(onValues)

    const valuesAfterEachUpdate = updatesAcrossLayers.map((update) => {
      reader.settings.update(update)

      return {
        update,
        held: reader.settings.values,
        emitted: onValues.mock.lastCall?.[0],
      }
    })

    expect(valuesAfterEachUpdate).toEqual(
      valuesAfterEachUpdate.map(({ update, held }) => ({
        update,
        held,
        emitted: held,
      })),
    )
  })

  it("emit nothing for an update that changes nothing", () => {
    const reader = createFullTestReader()
    const onValues = vi.fn()

    reader.settings.values$.subscribe(onValues)
    onValues.mockClear()
    reader.settings.update({ spreadMode: `auto`, fontScale: 1 })

    expect(onValues).not.toHaveBeenCalled()
  })

  it("emit once for an update that changes several layers", () => {
    const reader = createFullTestReader()
    const onValues = vi.fn()

    reader.settings.values$.subscribe(onValues)
    onValues.mockClear()
    reader.settings.update({ layoutLayerTransition: false, fontScale: 2 })

    expect(onValues.mock.calls).toEqual([
      [
        expect.objectContaining({
          layoutLayerTransition: false,
          fontScale: 2,
        }),
      ],
    ])
  })

  it("keep an update made by a subscriber on an emission", () => {
    const reader = createFullTestReader()

    reader.settings.values$.subscribe(function widenMarginsForLargeFont({
      fontScale,
      pageHorizontalMargin,
    }) {
      if (fontScale === 2 && pageHorizontalMargin !== 10) {
        reader.settings.update({ pageHorizontalMargin: 10 })
      }
    })
    reader.settings.update({ fontScale: 2 })

    expect(reader.settings.values.pageHorizontalMargin).toBe(10)
  })

  it("lay out for a font scale changed with a setting that does not lay out", () => {
    const reader = createFullTestReader()

    mountTestReader(reader)

    const spineLayout = vi.spyOn(reader.spine, `layout`)

    reader.settings.update({ layoutLayerTransition: false, fontScale: 2 })

    expect(spineLayout).toHaveBeenCalled()
  })
})
