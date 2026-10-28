import { isShallowEqual } from "@prose-reader/shared"
import type { ObservedValueOf } from "rxjs"
import { describe, expect, expectTypeOf, it, onTestFinished, vi } from "vitest"
import { createReaderWithEnhancers } from "../createReaderWithEnhancer"
import { createReader } from "../reader"
import {
  createFullTestReader,
  createPrePaginatedManifest,
  installReaderTestEnvironment,
  mountTestReader,
} from "../tests/readerHarness"
import type { ExtendedSettings, SettingsDefaults } from "./SettingsInterface"

installReaderTestEnvironment()

type FullTestReaderSettings = Parameters<
  ReturnType<typeof createFullTestReader>["settings"]["update"]
>[0]

/** An enhancer adding `defaults` to the reader's settings, as the guide does. */
const createEnhancerAddingSettings =
  <AddedSettings extends object>(defaults: SettingsDefaults<AddedSettings>) =>
  <
    InheritOptions,
    InheritOutput extends ReturnType<typeof createReaderWithEnhancers>,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions & Partial<AddedSettings>,
  ): Omit<InheritOutput, "settings"> & {
    settings: ExtendedSettings<InheritOutput["settings"], AddedSettings>
  } => {
    const reader = next(options)
    const inheritedSettings: InheritOutput["settings"] = reader.settings
    const settings = inheritedSettings.extend(defaults, options)

    return { ...reader, settings }
  }

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
    const updateWithUndeclaredSettings = {
      spreadMode: `never` as const,
      notAnUpdatedSetting: true,
      toString: `named like a member of every object`,
    }
    const reader = createFullTestReader(optionsWithAnUndeclaredSetting)

    reader.settings.update(updateWithUndeclaredSettings)

    expect(reader.settings.values).toEqual(
      expect.objectContaining({ fontScale: 2, spreadMode: `never` }),
    )
    expect(reader.settings.values).not.toHaveProperty(`notASetting`)
    expect(reader.settings.values).not.toHaveProperty(`notAnUpdatedSetting`)
    expect(Object.hasOwn(reader.settings.values, `toString`)).toBe(false)
  })

  it("type and hold the settings of enhancers added on top of each other", () => {
    const withConfirmMessage = createEnhancerAddingSettings({
      confirmMessage: `Leave the book?`,
    })
    const withTooltipDelay = createEnhancerAddingSettings({ tooltipDelay: 500 })
    const reader = withTooltipDelay(
      withConfirmMessage(createReaderWithEnhancers),
    )({ manifest: createPrePaginatedManifest(), tooltipDelay: 300 })
    const onValues = vi.fn()

    onTestFinished(() => reader.destroy())

    reader.settings.values$.subscribe(onValues)
    reader.settings.update({ confirmMessage: `Quit?`, fontScale: 2 })

    expectTypeOf<ObservedValueOf<typeof reader.settings.values$>>()
      .toHaveProperty(`confirmMessage`)
      .toEqualTypeOf<string>()
    expectTypeOf<ObservedValueOf<typeof reader.settings.values$>>()
      .toHaveProperty(`tooltipDelay`)
      .toEqualTypeOf<number>()
    expect(onValues).toHaveBeenLastCalledWith(
      expect.objectContaining({
        confirmMessage: `Quit?`,
        tooltipDelay: 300,
        fontScale: 2,
      }),
    )
  })

  it("refuse to add a setting that is already declared", () => {
    const reader = createFullTestReader()

    expect(() => reader.settings.extend({ fontScale: 1 }, {})).toThrow(
      `The setting "fontScale" is already declared`,
    )
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

  it("keep an update made by a subscriber on an emission, and end every subscriber on it", () => {
    const reader = createFullTestReader()
    const onValuesAfterTheUpdatingSubscriber = vi.fn()

    reader.settings.values$.subscribe(function widenMarginsForLargeFont({
      fontScale,
      pageHorizontalMargin,
    }) {
      if (fontScale === 2 && pageHorizontalMargin !== 10) {
        reader.settings.update({ pageHorizontalMargin: 10 })
      }
    })
    reader.settings.values$.subscribe(onValuesAfterTheUpdatingSubscriber)
    reader.settings.update({ fontScale: 2 })

    expect(reader.settings.values.pageHorizontalMargin).toBe(10)
    expect(onValuesAfterTheUpdatingSubscriber).toHaveBeenLastCalledWith(
      reader.settings.values,
    )
  })

  it("lay out for a font scale changed with a setting that does not lay out", () => {
    const reader = createFullTestReader()

    mountTestReader(reader)

    const spineLayout = vi.spyOn(reader.spine, `layout`)

    reader.settings.update({ layoutLayerTransition: false, fontScale: 2 })

    expect(spineLayout).toHaveBeenCalledTimes(1)
  })
})
