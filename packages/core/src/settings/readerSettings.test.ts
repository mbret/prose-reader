import { isShallowEqual } from "@prose-reader/shared"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import { createReader } from "../reader"
import {
  createFullTestReader,
  createPrePaginatedManifest,
  installReaderTestEnvironment,
  mountTestReader,
} from "../tests/readerHarness"

installReaderTestEnvironment()

type FullTestReaderSettings = Parameters<
  ReturnType<typeof createFullTestReader>["settings"]["update"]
>[0]

/**
 * Settings of the core reader, of the layout enhancer and of the fonts
 * enhancer, alone and together. The first and the seventh change nothing.
 */
const updatesAcrossEnhancers: FullTestReaderSettings[] = [
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
  it("start from each enhancer's defaults, under the settings given at creation", () => {
    const reader = createFullTestReader({
      fontScale: 2,
      pageHorizontalMargin: 7,
    })

    expect(reader.settings.values).toEqual(
      expect.objectContaining({
        fontScale: 2,
        lineHeight: `publisher`,
        fontWeight: `publisher`,
        fontJustification: `publisher`,
        pageHorizontalMargin: 7,
        pageVerticalMargin: 24,
        layoutAutoResize: `container`,
        layoutLayerTransition: true,
        spreadMode: `auto`,
      }),
    )
  })

  it("hold no enhancer's setting in a reader without enhancers, whatever its options carry", () => {
    const optionsWithAFontsSetting = {
      manifest: createPrePaginatedManifest(),
      fontScale: 2,
    }
    const reader = createReader(optionsWithAFontsSetting)

    onTestFinished(() => reader.destroy())

    expect(reader.settings.values).not.toHaveProperty(`fontScale`)
  })

  it("leave out what no settings declare, at creation and on an update", () => {
    const optionsWithAnUndeclaredSetting = { fontScale: 2, notASetting: true }
    const updateWithAnUndeclaredSetting = {
      spreadMode: `never` as const,
      notAnUpdatedSetting: true,
    }
    const reader = createFullTestReader(optionsWithAnUndeclaredSetting)

    reader.settings.update(updateWithAnUndeclaredSetting)

    expect(reader.settings.values).toEqual(
      expect.objectContaining({ fontScale: 2, spreadMode: `never` }),
    )
    expect(reader.settings.values).not.toHaveProperty(`notASetting`)
    expect(reader.settings.values).not.toHaveProperty(`notAnUpdatedSetting`)
  })

  it("keep each default over a setting given as undefined", () => {
    const reader = createFullTestReader({
      fontScale: undefined,
      spreadMode: undefined,
    })

    expect(reader.settings.values).toEqual(
      expect.objectContaining({ fontScale: 1, spreadMode: `auto` }),
    )
  })

  it("hold each update, and emit once for one that changes them, with every setting it left", () => {
    const reader = createFullTestReader()
    const onValues = vi.fn()

    reader.settings.values$.subscribe(onValues)

    const resultOfEachUpdate = updatesAcrossEnhancers.map((update) => {
      const valuesBeforeUpdate = reader.settings.values

      onValues.mockClear()
      reader.settings.update(update)

      const values = reader.settings.values

      return {
        update,
        values,
        changed: !isShallowEqual(valuesBeforeUpdate, values),
        emitted: [...onValues.mock.calls],
      }
    })

    expect(resultOfEachUpdate.map(({ changed }) => changed)).toEqual([
      false,
      true,
      true,
      true,
      true,
      true,
      false,
      true,
    ])
    expect(resultOfEachUpdate).toEqual(
      resultOfEachUpdate.map(({ update, values, changed }) => ({
        update,
        values: expect.objectContaining(update),
        changed,
        emitted: changed ? [[values]] : [],
      })),
    )
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

    expect(spineLayout).toHaveBeenCalledTimes(1)
  })
})
