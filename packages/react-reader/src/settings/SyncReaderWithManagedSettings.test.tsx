/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import type { CoreInputSettings, Theme } from "@prose-reader/core"
import { act, type ComponentProps, type ReactNode, useState } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReactReaderProvider } from "../context/ReactReaderProvider"
import type { ManagedSettingName } from "./managedSettings"
import { SyncReaderWithManagedSettings } from "./SyncReaderWithManagedSettings"
import { useManagedSetting } from "./useManagedSetting"

type ManagedReaderSettings = Pick<CoreInputSettings, "spreadMode"> & {
  fontScale: number
  theme: Theme
}

type ReactReaderProviderProps = Omit<
  ComponentProps<typeof ReactReaderProvider>,
  "children"
>

type SettingsChange = Parameters<
  NonNullable<ReactReaderProviderProps["onSettingsChange"]>
>

/** What the reader declares as defaults, whatever it was created with. */
const READER_DEFAULT_SETTINGS: ManagedReaderSettings = {
  fontScale: 1,
  spreadMode: `auto`,
  theme: `bright`,
}

const createReaderWithSettings = (
  initialSettings: Partial<ManagedReaderSettings> = {},
) => {
  const values$ = new BehaviorSubject<ManagedReaderSettings>({
    ...READER_DEFAULT_SETTINGS,
    ...initialSettings,
  })

  return {
    settings: {
      defaults: READER_DEFAULT_SETTINGS,
      values$,
      get values() {
        return values$.value
      },
      update: vi.fn(function updateSettings(
        settings: Partial<ManagedReaderSettings>,
      ) {
        values$.next({ ...values$.value, ...settings })
      }),
    },
  }
}

type TestReader = ReturnType<typeof createReaderWithSettings>

const asProvidedReader = (reader: TestReader | undefined) =>
  // Cast: the fake holds only the settings react-reader syncs, not a whole
  // reader, and the provider takes a whole reader.
  reader as unknown as ReactReaderProviderProps["reader"]

/** What a menu of a setting sees of it, as of the last render. */
const createSettingMenu = <Name extends ManagedSettingName>(name: Name) => {
  const seen: { current?: ReturnType<typeof useManagedSetting<Name>> } = {}
  const SettingMenu = () => {
    seen.current = useManagedSetting(name)

    return null
  }

  return { seen, SettingMenu }
}

/**
 * An app that saves every change react-reader reports and passes it back, as
 * react-reader's guide shows: a global or internal change into `settings`, a
 * scope's into `settingsByScope`, and the scope picked for a setting into
 * `settingsScopes`.
 */
const AppSavingEveryChange = ({
  reader,
  defaultSettings,
  initialSettings,
  savedChanges = [],
  children,
}: {
  reader: TestReader | undefined
  defaultSettings?: ReactReaderProviderProps["defaultSettings"]
  initialSettings?: ReactReaderProviderProps["settings"]
  savedChanges?: SettingsChange[]
  children?: ReactNode
}) => {
  const [settings, setSettings] = useState(initialSettings)
  const [settingsByScope, setSettingsByScope] = useState<
    NonNullable<ReactReaderProviderProps["settingsByScope"]>
  >({})
  const [settingsScopes, setSettingsScopes] = useState<
    NonNullable<ReactReaderProviderProps["settingsScopes"]>
  >({})

  return (
    <ReactReaderProvider
      reader={asProvidedReader(reader)}
      defaultSettings={defaultSettings}
      settings={settings}
      settingsByScope={settingsByScope}
      settingsScopes={settingsScopes}
      onSettingsChange={function saveSettings(changes, from) {
        savedChanges.push([changes, from])

        if (from === `global` || from === `internal`) {
          setSettings((old) => ({ ...old, ...changes }))
        } else {
          setSettingsByScope((old) => ({
            ...old,
            [from]: { ...old[from], ...changes },
          }))
        }
      }}
      onSettingsScopesChange={function saveSettingsScopes(changes) {
        setSettingsScopes((old) => ({ ...old, ...changes }))
      }}
    >
      <SyncReaderWithManagedSettings />
      {children}
    </ReactReaderProvider>
  )
}

const hasViewportControl = (
  happyDOM: unknown,
): happyDOM is {
  setViewport: (viewport: { width: number; height: number }) => void
} =>
  typeof happyDOM === `object` &&
  happyDOM !== null &&
  `setViewport` in happyDOM &&
  typeof happyDOM.setViewport === `function`

/** Sets the width of the window happy-dom emulates, which media queries follow. */
const setWindowWidth = (width: number) => {
  const happyDOM: unknown = Reflect.get(window, `happyDOM`)

  if (!hasViewportControl(happyDOM)) {
    throw new Error(
      `These tests run in happy-dom, to control the window's width`,
    )
  }

  happyDOM.setViewport({ width, height: window.innerHeight })
}

const DEFAULT_WINDOW_WIDTH = window.innerWidth

describe(`SyncReaderWithManagedSettings`, () => {
  let root: ReturnType<typeof createRoot>

  const renderInChakra = async (element: ReactNode) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>,
      )
    })
  }

  const render = async (props: ReactReaderProviderProps, menu?: ReactNode) => {
    await renderInChakra(
      <ReactReaderProvider {...props}>
        <SyncReaderWithManagedSettings />
        {menu}
      </ReactReaderProvider>,
    )
  }

  /**
   * Mounts the sync with what a spread mode menu sees of the setting, which
   * the returned object holds as of the last render.
   */
  const renderWithSpreadModeMenu = async (props: ReactReaderProviderProps) => {
    const spreadModeMenu = createSettingMenu(`spreadMode`)

    await render(props, <spreadModeMenu.SettingMenu />)

    return spreadModeMenu.seen
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    root = createRoot(document.createElement(`div`))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    setWindowWidth(DEFAULT_WINDOW_WIDTH)
  })

  it(`keeps the app's values when the reader arrives holding others`, async () => {
    const reader = createReaderWithSettings({
      fontScale: 1,
      spreadMode: `auto`,
    })
    const savedChanges: SettingsChange[] = []
    const renderApp = async (providedReader: TestReader | undefined) => {
      await renderInChakra(
        <AppSavingEveryChange
          reader={providedReader}
          initialSettings={{ fontScale: 1.5, spreadMode: `never` }}
          savedChanges={savedChanges}
        />,
      )
    }

    await renderApp(undefined)
    await renderApp(reader)

    expect(reader.settings.values).toEqual({
      fontScale: 1.5,
      spreadMode: `never`,
      theme: `bright`,
    })
    expect(savedChanges).toEqual([])
  })

  it(`writes the app's font scale into the reader`, async () => {
    const reader = createReaderWithSettings()

    await render({
      reader: asProvidedReader(reader),
      settings: { fontScale: 1.5 },
    })

    expect(reader.settings.values.fontScale).toBe(1.5)
  })

  it(`writes the app's spread mode into the reader at once`, async () => {
    const reader = createReaderWithSettings()

    await render({
      reader: asProvidedReader(reader),
      settings: { spreadMode: `never` },
    })

    expect(reader.settings.values.spreadMode).toBe(`never`)
  })

  it(`writes the app's theme into the reader at once`, async () => {
    const reader = createReaderWithSettings({ theme: `bright` })

    await render({
      reader: asProvidedReader(reader),
      settings: { theme: `night` },
    })

    expect(reader.settings.values.theme).toBe(`night`)
  })

  it(`takes a setting's value from its scope, and from the global values when its scope has none`, async () => {
    const reader = createReaderWithSettings()

    await render({
      reader: asProvidedReader(reader),
      settings: { fontScale: 1.2, spreadMode: `never` },
      settingsByScope: { book: { spreadMode: `always` } },
      settingsScopes: { fontScale: `book`, spreadMode: `book` },
    })

    expect(reader.settings.values).toEqual({
      fontScale: 1.2,
      spreadMode: `always`,
      theme: `bright`,
    })
  })

  it(`takes defaultSettings for a setting no scope gives a value, under the global and scope values`, async () => {
    const reader = createReaderWithSettings()

    await render({
      reader: asProvidedReader(reader),
      defaultSettings: { fontScale: 1.2, spreadMode: `never`, theme: `sepia` },
      settings: { spreadMode: `always`, theme: `night` },
      settingsByScope: { book: { theme: `publisher` } },
      settingsScopes: { theme: `book` },
    })

    expect(reader.settings.values).toEqual({
      fontScale: 1.2,
      spreadMode: `always`,
      theme: `publisher`,
    })
  })

  it(`writes the reader's declared default over the value it was created with when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })

    await render({ reader: asProvidedReader(reader) })

    expect(reader.settings.values.spreadMode).toBe(`auto`)
  })

  it(`shows on the global tab the reader's declared default as the value it inherits, and no value of its own, when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(reader),
    })

    expect({
      ownSpreadMode: spreadModeMenu.current?.getOwnValueForScope(`global`),
      inheritedSpreadMode:
        spreadModeMenu.current?.getInheritedValueForScope(`global`),
    }).toEqual({ ownSpreadMode: undefined, inheritedSpreadMode: `auto` })
  })

  it(`inherits the reader's declared default on the global tab, not the value the reader was created with, and applies it once picked`, async () => {
    const reader = createReaderWithSettings({ fontScale: 1.5 })
    const fontScaleMenu = createSettingMenu(`fontScale`)

    await renderInChakra(
      <AppSavingEveryChange
        reader={reader}
        initialSettings={{ fontScale: 1.5 }}
      >
        <fontScaleMenu.SettingMenu />
      </AppSavingEveryChange>,
    )
    const inheritedFontScale =
      fontScaleMenu.seen.current?.getInheritedValueForScope(`global`)
    await act(async () => {
      fontScaleMenu.seen.current?.changeValueForScope(`global`, undefined)
    })

    expect({
      inheritedFontScale,
      readerFontScale: reader.settings.values.fontScale,
    }).toEqual({ inheritedFontScale: 1, readerFontScale: 1 })
  })

  it(`does not report the value the reader arrives with, and reports a value it takes afterwards as an internal change it keeps`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })
    const onSettingsChange = vi.fn()
    const props = { onSettingsChange }

    await renderWithSpreadModeMenu({ ...props, reader: undefined })
    const spreadModeMenu = await renderWithSpreadModeMenu({
      ...props,
      reader: asProvidedReader(reader),
    })
    const spreadModeOnArrival = reader.settings.values.spreadMode
    await act(async () => {
      reader.settings.update({ spreadMode: `never` })
    })

    expect({
      spreadModeOnArrival,
      reported: onSettingsChange.mock.calls,
      shownSpreadMode: spreadModeMenu.current?.getValueForScope(`global`),
    }).toEqual({
      spreadModeOnArrival: `auto`,
      reported: [[{ spreadMode: `never` }, `internal`]],
      shownSpreadMode: `never`,
    })
  })

  it(`reports a spread mode set on the reader directly as an internal change`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `never` })
    const onSettingsChange = vi.fn()

    await render({
      reader: asProvidedReader(reader),
      settings: { spreadMode: `never` },
      onSettingsChange,
    })
    await act(async () => {
      reader.settings.update({ spreadMode: `always` })
    })

    expect(onSettingsChange).toHaveBeenCalledWith(
      { spreadMode: `always` },
      `internal`,
    )
  })

  it(`does not keep a value set on the reader directly while the app gives one, so dropping the app's value falls to defaultSettings`, async () => {
    const reader = createReaderWithSettings()
    const onSettingsChange = vi.fn()
    const props = {
      reader: asProvidedReader(reader),
      defaultSettings: { spreadMode: `always` },
      onSettingsChange,
    } as const

    await render({ ...props, settings: { spreadMode: `never` } })
    await act(async () => {
      reader.settings.update({ spreadMode: `auto` })
    })
    await render({ ...props, settings: {} })

    expect({
      reported: onSettingsChange.mock.calls,
      readerSpreadMode: reader.settings.values.spreadMode,
    }).toEqual({
      reported: [[{ spreadMode: `auto` }, `internal`]],
      readerSpreadMode: `always`,
    })
  })

  it(`writes a spread mode chosen in the menu into the reader when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `auto` })

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(reader),
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`global`, `never`)
    })

    expect(reader.settings.values.spreadMode).toBe(`never`)
    expect(spreadModeMenu.current?.getValueForScope(`global`)).toBe(`never`)
  })

  it(`applies a spread mode chosen in the menu, and reports it once, when the app only listens`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `auto` })
    const onSettingsChange = vi.fn()

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(reader),
      onSettingsChange,
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`global`, `never`)
    })

    expect(reader.settings.values.spreadMode).toBe(`never`)
    expect(onSettingsChange.mock.calls).toEqual([
      [{ spreadMode: `never` }, `global`],
    ])
  })

  it(`sets a scope back to the value it inherits, and reports undefined with that scope, when the app only listens`, async () => {
    const reader = createReaderWithSettings()
    const onSettingsChange = vi.fn()

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(reader),
      onSettingsChange,
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`global`, `never`)
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`global`, undefined)
    })

    expect({
      reported: onSettingsChange.mock.calls,
      ownSpreadMode: spreadModeMenu.current?.getOwnValueForScope(`global`),
      readerSpreadMode: reader.settings.values.spreadMode,
    }).toEqual({
      reported: [
        [{ spreadMode: `never` }, `global`],
        [{ spreadMode: undefined }, `global`],
      ],
      ownSpreadMode: undefined,
      readerSpreadMode: `auto`,
    })
  })

  it(`keeps the reader on the theme the scope in effect applies, through picks, a change of the app's default, a scope change and a return to Default`, async () => {
    const reader = createReaderWithSettings()
    const themeMenu = createSettingMenu(`theme`)
    const savedChanges: SettingsChange[] = []
    const readerThemeAgainstThemeInEffect: {
      readerTheme: Theme
      themeInEffect: Theme | undefined
    }[] = []
    const renderAppWithDefaultTheme = (defaultTheme: Theme) =>
      renderInChakra(
        <AppSavingEveryChange
          reader={reader}
          defaultSettings={{ theme: defaultTheme }}
          savedChanges={savedChanges}
        >
          <themeMenu.SettingMenu />
        </AppSavingEveryChange>,
      )
    const recordReaderThemeAgainstThemeInEffect = () => {
      const menu = themeMenu.seen.current

      readerThemeAgainstThemeInEffect.push({
        readerTheme: reader.settings.values.theme,
        themeInEffect: menu?.getValueForScope(menu.activeScope ?? `global`),
      })
    }

    await renderAppWithDefaultTheme(`night`)
    recordReaderThemeAgainstThemeInEffect()
    await act(async () => {
      themeMenu.seen.current?.changeValueForScope(`global`, `sepia`)
    })
    recordReaderThemeAgainstThemeInEffect()
    await act(async () => {
      themeMenu.seen.current?.changeValueForScope(`global`, `night`)
    })
    recordReaderThemeAgainstThemeInEffect()
    await renderAppWithDefaultTheme(`bright`)
    recordReaderThemeAgainstThemeInEffect()
    await act(async () => {
      themeMenu.seen.current?.onActiveScopeChange?.(`book`)
    })
    recordReaderThemeAgainstThemeInEffect()
    await act(async () => {
      themeMenu.seen.current?.changeValueForScope(`global`, undefined)
    })
    recordReaderThemeAgainstThemeInEffect()

    expect({ readerThemeAgainstThemeInEffect, savedChanges }).toEqual({
      readerThemeAgainstThemeInEffect: [
        { readerTheme: `night`, themeInEffect: `night` },
        { readerTheme: `sepia`, themeInEffect: `sepia` },
        { readerTheme: `night`, themeInEffect: `night` },
        { readerTheme: `night`, themeInEffect: `night` },
        { readerTheme: `night`, themeInEffect: `night` },
        { readerTheme: `bright`, themeInEffect: `bright` },
      ],
      savedChanges: [
        [{ theme: `sepia` }, `global`],
        [{ theme: `night` }, `global`],
        [{ theme: undefined }, `global`],
      ],
    })
  })

  it(`reports a value chosen for a scope with that scope, leaving the app's value in effect`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `never` })
    const onSettingsChange = vi.fn()

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(reader),
      settings: { spreadMode: `never` },
      settingsScopes: { spreadMode: `book` },
      onSettingsChange,
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`book`, `always`)
    })

    expect(onSettingsChange).toHaveBeenCalledWith(
      { spreadMode: `always` },
      `book`,
    )
    expect(reader.settings.values.spreadMode).toBe(`never`)
  })

  it(`keeps a value chosen for a screen other than the one in effect as that screen's own, and applies it on that screen, when the app only listens`, async () => {
    // The window grows rather than shrinks: happy-dom 21.0.3 starts each media
    // query listener as not matching, so a query that matches when listened to
    // never reports that it stopped.
    setWindowWidth(400)
    const reader = createReaderWithSettings()

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(reader),
      settingsScopes: { spreadMode: `screen` },
      onSettingsChange: vi.fn(),
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`desktop`, `never`)
    })
    const beforeTheWindowIsDesktop = {
      ownDesktopSpreadMode:
        spreadModeMenu.current?.getOwnValueForScope(`desktop`),
      readerSpreadMode: reader.settings.values.spreadMode,
    }
    await act(async () => {
      setWindowWidth(1200)
    })

    expect({
      beforeTheWindowIsDesktop,
      readerSpreadModeOnDesktop: reader.settings.values.spreadMode,
    }).toEqual({
      beforeTheWindowIsDesktop: {
        ownDesktopSpreadMode: `never`,
        readerSpreadMode: `auto`,
      },
      readerSpreadModeOnDesktop: `never`,
    })
  })

  it(`keeps react-reader's own book value while the reader stays, whatever else the app passes again`, async () => {
    const reader = createReaderWithSettings()
    const props = {
      reader: asProvidedReader(reader),
      settingsScopes: { spreadMode: `book` },
    } as const

    const spreadModeMenu = await renderWithSpreadModeMenu({
      ...props,
      onSettingsChange: function listenToSettings() {},
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`book`, `never`)
    })
    await renderWithSpreadModeMenu({
      ...props,
      onSettingsChange: function listenToSettingsAgain() {},
    })

    expect(reader.settings.values.spreadMode).toBe(`never`)
  })

  it(`drops react-reader's own book value when the reader is replaced, so the new reader never takes it`, async () => {
    const firstReader = createReaderWithSettings()
    const secondReader = createReaderWithSettings()
    const settingsScopes = { spreadMode: `book` } as const

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(firstReader),
      settingsScopes,
    })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`book`, `never`)
    })
    await renderWithSpreadModeMenu({
      reader: asProvidedReader(secondReader),
      settingsScopes,
    })

    expect({
      firstReaderSpreadMode: firstReader.settings.values.spreadMode,
      secondReaderUpdates: secondReader.settings.update.mock.calls,
    }).toEqual({ firstReaderSpreadMode: `never`, secondReaderUpdates: [] })
  })

  it(`shows in a scope's tab the value that scope applies, the global one when it has none`, async () => {
    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: asProvidedReader(createReaderWithSettings()),
      settings: { spreadMode: `never` },
      settingsByScope: { book: { spreadMode: `always` } },
      settingsScopes: { spreadMode: `book` },
    })

    expect(spreadModeMenu.current?.getValueForScope(`book`)).toBe(`always`)
    expect(spreadModeMenu.current?.getValueForScope(`mobile`)).toBe(`never`)
  })

  it(`takes the value of the screen the book is read on for a setting with the screen scope, without another value first`, async () => {
    setWindowWidth(800)
    const reader = createReaderWithSettings({ spreadMode: `auto` })

    await render({
      reader: asProvidedReader(reader),
      settings: { spreadMode: `never` },
      settingsByScope: {
        tablet: { spreadMode: `always` },
        desktop: { spreadMode: `auto` },
      },
      settingsScopes: { spreadMode: `screen` },
    })

    expect(reader.settings.update.mock.calls).toEqual([
      [{ spreadMode: `always` }],
    ])
  })

  it(`shows the screen the book is read on as the scope in effect, from a menu's first render`, async () => {
    setWindowWidth(800)
    const reader = createReaderWithSettings()
    const activeScopes: unknown[] = []
    const SpreadModeMenu = () => {
      activeScopes.push(useManagedSetting(`spreadMode`).activeScope)

      return null
    }
    const props = {
      reader: asProvidedReader(reader),
      settingsScopes: { spreadMode: `screen` },
    } as const

    await render(props)
    await render(props, <SpreadModeMenu />)

    expect(activeScopes[0]).toBe(`tablet`)
  })

  it(`offers the scopes once the app passes settingsScopes`, async () => {
    const reader = asProvidedReader(createReaderWithSettings())

    const menuWithoutScopes = await renderWithSpreadModeMenu({ reader })

    expect(menuWithoutScopes.current?.activeScope).toBeUndefined()
    expect(menuWithoutScopes.current?.onActiveScopeChange).toBeUndefined()

    const onSettingsScopesChange = vi.fn()
    const menuWithScopes = await renderWithSpreadModeMenu({
      reader,
      settingsScopes: {},
      onSettingsScopesChange,
    })
    await act(async () => {
      menuWithScopes.current?.onActiveScopeChange?.(`book`)
    })

    expect(menuWithScopes.current?.activeScope).toBe(`global`)
    expect(onSettingsScopesChange).toHaveBeenCalledWith({ spreadMode: `book` })
  })
})
