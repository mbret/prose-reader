/* @vitest-environment happy-dom */

import type { CoreInputSettings } from "@prose-reader/core"
import { act, type ComponentProps, useState } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type ManagedReaderSettings = Pick<CoreInputSettings, "spreadMode"> & {
  fontScale: number
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

describe(`SyncReaderWithManagedSettings`, () => {
  let root: ReturnType<typeof createRoot>

  const render = async (props: ReactReaderProviderProps) => {
    await act(async () => {
      root.render(
        <ReactReaderProvider {...props}>
          <SyncReaderWithManagedSettings />
        </ReactReaderProvider>,
      )
    })
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

    await act(async () => {
      root.render(
        <ReactReaderProvider {...props}>
          <SyncReaderWithManagedSettings />
          <SpreadModeMenu />
        </ReactReaderProvider>,
      )
    })

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
  })

  it(`keeps the app's values when the reader arrives holding others`, async () => {
    const reader = createReaderWithSettings({
      fontScale: 1,
      spreadMode: `auto`,
    })
    const savedChanges: SettingsChange[] = []
    const renderApp = async () => {
      await act(async () => {
        root.render(
          <AppSavingEveryChange
            initialSettings={{ fontScale: 1.5, spreadMode: `never` }}
            savedChanges={savedChanges}
          />,
        )
      })
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
