/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import type { CoreInputSettings, Theme } from "@prose-reader/core"
import { act, type ComponentProps, type ReactNode, useState } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type ManagedReaderSettings = Pick<CoreInputSettings, "spreadMode"> & {
  fontScale: number
  theme?: Theme
}

/**
 * The reader the components get from `useReader`. Like the real hook, which
 * reads the context, a component using it renders again when it changes.
 */
const { testReader } = vi.hoisted(() => {
  let reader: unknown
  const listeners = new Set<() => void>()

  return {
    testReader: {
      get: () => reader,
      set: (nextReader: unknown) => {
        reader = nextReader
        for (const listener of listeners) listener()
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener)

        return () => {
          listeners.delete(listener)
        }
      },
    },
  }
})

vi.mock("../context/useReader", async () => {
  const { useSyncExternalStore } = await import("react")

  return {
    useReader: () => useSyncExternalStore(testReader.subscribe, testReader.get),
  }
})

import { ReactReaderProvider } from "../context/ReactReaderProvider"
import { SyncReaderWithManagedSettings } from "./SyncReaderWithManagedSettings"
import { useManagedSetting } from "./useManagedSetting"

type ReactReaderProviderProps = Omit<
  ComponentProps<typeof ReactReaderProvider>,
  "children"
>

type SettingsChange = Parameters<
  NonNullable<ReactReaderProviderProps["onSettingsChange"]>
>

const createReaderWithSettings = (
  initialSettings: Partial<ManagedReaderSettings> = {},
) => {
  const values$ = new BehaviorSubject<ManagedReaderSettings>({
    fontScale: 1,
    spreadMode: `auto`,
    ...initialSettings,
  })

  return {
    settings: {
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

/**
 * An app that saves every change react-reader reports into its settings and
 * passes them back, as react-reader's guide shows.
 */
const AppSavingEveryChange = ({
  initialSettings,
  savedChanges,
}: {
  initialSettings: ReactReaderProviderProps["settings"]
  savedChanges: SettingsChange[]
}) => {
  const [settings, setSettings] = useState(initialSettings)

  return (
    <ReactReaderProvider
      reader={undefined}
      settings={settings}
      onSettingsChange={function saveSettings(changes, from) {
        savedChanges.push([changes, from])
        setSettings((old) => ({ ...old, ...changes }))
      }}
    >
      <SyncReaderWithManagedSettings />
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

  const render = async (props: ReactReaderProviderProps) => {
    await renderInChakra(
      <ReactReaderProvider {...props}>
        <SyncReaderWithManagedSettings />
      </ReactReaderProvider>,
    )
  }

  /**
   * Mounts the sync with what a spread mode menu sees of the setting, which
   * the returned object holds as of the last render.
   */
  const renderWithSpreadModeMenu = async (props: ReactReaderProviderProps) => {
    const spreadModeMenu: {
      current?: ReturnType<typeof useManagedSetting<"spreadMode">>
    } = {}
    const SpreadModeMenu = () => {
      spreadModeMenu.current = useManagedSetting(`spreadMode`)

      return null
    }

    await renderInChakra(
      <ReactReaderProvider {...props}>
        <SyncReaderWithManagedSettings />
        <SpreadModeMenu />
      </ReactReaderProvider>,
    )

    return spreadModeMenu
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    root = createRoot(document.createElement(`div`))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    testReader.set(undefined)
    setWindowWidth(DEFAULT_WINDOW_WIDTH)
  })

  it(`keeps the app's values when the reader arrives holding others`, async () => {
    const reader = createReaderWithSettings({
      fontScale: 1,
      spreadMode: `auto`,
    })
    const savedChanges: SettingsChange[] = []
    const renderApp = async () => {
      await renderInChakra(
        <AppSavingEveryChange
          initialSettings={{ fontScale: 1.5, spreadMode: `never` }}
          savedChanges={savedChanges}
        />,
      )
    }

    await renderApp()
    await act(async () => {
      testReader.set(reader)
    })

    expect(reader.settings.values).toEqual({
      fontScale: 1.5,
      spreadMode: `never`,
    })
    expect(savedChanges).toEqual([])
  })

  it(`writes the app's font scale into the reader`, async () => {
    const reader = createReaderWithSettings()
    testReader.set(reader)

    await render({ reader: undefined, settings: { fontScale: 1.5 } })

    expect(reader.settings.values.fontScale).toBe(1.5)
  })

  it(`writes the app's spread mode into the reader at once`, async () => {
    const reader = createReaderWithSettings()
    testReader.set(reader)

    await render({ reader: undefined, settings: { spreadMode: `never` } })

    expect(reader.settings.values.spreadMode).toBe(`never`)
  })

  it(`writes the app's theme into the reader at once`, async () => {
    const reader = createReaderWithSettings({ theme: `bright` })
    testReader.set(reader)

    await render({ reader: undefined, settings: { theme: `night` } })

    expect(reader.settings.values.theme).toBe(`night`)
  })

  it(`takes a setting's value from its scope, and from the global values when its scope has none`, async () => {
    const reader = createReaderWithSettings()
    testReader.set(reader)

    await render({
      reader: undefined,
      settings: { fontScale: 1.2, spreadMode: `never` },
      settingsByScope: { book: { spreadMode: `always` } },
      settingsScopes: { fontScale: `book`, spreadMode: `book` },
    })

    expect(reader.settings.values).toEqual({
      fontScale: 1.2,
      spreadMode: `always`,
    })
  })

  it(`reports a spread mode set on the reader directly as an internal change`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `never` })
    const onSettingsChange = vi.fn()
    testReader.set(reader)

    await render({
      reader: undefined,
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

  it(`keeps the spread mode the reader was created with when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })
    testReader.set(reader)

    await render({ reader: undefined })

    expect(reader.settings.values.spreadMode).toBe(`always`)
    expect(reader.settings.update).not.toHaveBeenCalledWith({
      spreadMode: `auto`,
    })
  })

  it(`shows the spread mode the reader was created with in the menu when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })
    testReader.set(reader)

    const spreadModeMenu = await renderWithSpreadModeMenu({ reader: undefined })

    expect(spreadModeMenu.current?.getValueForScope(`global`)).toBe(`always`)
  })

  it(`shows the spread mode the reader arrives with when the app passes none, and reports only the values it takes afterwards`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })
    const onSettingsChange = vi.fn()

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: undefined,
      onSettingsChange,
    })
    await act(async () => {
      testReader.set(reader)
    })

    expect(spreadModeMenu.current?.getValueForScope(`global`)).toBe(`always`)

    await act(async () => {
      reader.settings.update({ spreadMode: `never` })
    })

    expect(onSettingsChange.mock.calls).toEqual([
      [{ spreadMode: `never` }, `internal`],
    ])
  })

  it(`writes a spread mode chosen in the menu into the reader when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `auto` })
    testReader.set(reader)

    const spreadModeMenu = await renderWithSpreadModeMenu({ reader: undefined })
    await act(async () => {
      spreadModeMenu.current?.changeValueForScope(`global`, `never`)
    })

    expect(reader.settings.values.spreadMode).toBe(`never`)
    expect(spreadModeMenu.current?.getValueForScope(`global`)).toBe(`never`)
  })

  it(`applies a spread mode chosen in the menu, and reports it once, when the app only listens`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `auto` })
    const onSettingsChange = vi.fn()
    testReader.set(reader)

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: undefined,
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

  it(`reports a value chosen for a scope with that scope, leaving the app's value in effect`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `never` })
    const onSettingsChange = vi.fn()
    testReader.set(reader)

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: undefined,
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

  it(`shows in a scope's tab the value that scope applies, the global one when it has none`, async () => {
    testReader.set(createReaderWithSettings())

    const spreadModeMenu = await renderWithSpreadModeMenu({
      reader: undefined,
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
    testReader.set(reader)

    await render({
      reader: undefined,
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
    testReader.set(createReaderWithSettings())
    const activeScopes: unknown[] = []
    const SpreadModeMenu = () => {
      activeScopes.push(useManagedSetting(`spreadMode`).activeScope)

      return null
    }
    const renderReaderWithMenu = (menu: ReactNode) =>
      renderInChakra(
        <ReactReaderProvider
          reader={undefined}
          settingsScopes={{ spreadMode: `screen` }}
        >
          <SyncReaderWithManagedSettings />
          {menu}
        </ReactReaderProvider>,
      )

    await renderReaderWithMenu(null)
    await renderReaderWithMenu(<SpreadModeMenu />)

    expect(activeScopes[0]).toBe(`tablet`)
  })

  it(`offers the scopes once the app passes settingsScopes`, async () => {
    testReader.set(createReaderWithSettings())

    const menuWithoutScopes = await renderWithSpreadModeMenu({
      reader: undefined,
    })

    expect(menuWithoutScopes.current?.activeScope).toBeUndefined()
    expect(menuWithoutScopes.current?.onActiveScopeChange).toBeUndefined()

    const onSettingsScopesChange = vi.fn()
    const menuWithScopes = await renderWithSpreadModeMenu({
      reader: undefined,
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
