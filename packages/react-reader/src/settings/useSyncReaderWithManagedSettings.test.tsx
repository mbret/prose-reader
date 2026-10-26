/* @vitest-environment happy-dom */

import type { CoreInputSettings, Theme } from "@prose-reader/core"
import { act, type ComponentProps, useState } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type ManagedReaderSettings = Pick<CoreInputSettings, "spreadMode"> & {
  fontScale: number
  theme: Theme
}

const { useReaderMock } = vi.hoisted(() => ({ useReaderMock: vi.fn() }))

vi.mock("../context/useReader", () => ({ useReader: useReaderMock }))

import { ReactReaderProvider } from "../context/ReactReaderProvider"
import { useSyncReaderWithManagedSettings } from "./useSyncReaderWithManagedSettings"

const createReaderWithSettings = (
  initialSettings: Partial<ManagedReaderSettings> = {},
) => {
  const values$ = new BehaviorSubject<ManagedReaderSettings>({
    fontScale: 1,
    spreadMode: `auto`,
    theme: `bright`,
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

const SyncReaderWithManagedSettingsProbe = () => {
  useSyncReaderWithManagedSettings()

  return null
}

type SavedChange = [
  setting: "fontSize" | "spreadMode" | "theme",
  from: string,
  value: number | string,
]

/**
 * An app that saves every change react-reader reports and passes it back, as
 * react-reader's guide shows.
 */
const AppSavingEveryChange = ({
  initialFontSize,
  initialSpreadMode,
  initialTheme,
  savedChanges,
}: {
  initialFontSize: number
  initialSpreadMode: CoreInputSettings["spreadMode"]
  initialTheme: Theme
  savedChanges: SavedChange[]
}) => {
  const [fontSize, setFontSize] = useState(initialFontSize)
  const [spreadMode, setSpreadMode] = useState(initialSpreadMode)
  const [theme, setTheme] = useState(initialTheme)

  return (
    <ReactReaderProvider
      reader={undefined}
      fontSize={fontSize}
      onFontSizeChange={function saveFontSize(from, value) {
        savedChanges.push([`fontSize`, from, value])
        setFontSize(value)
      }}
      spreadMode={spreadMode}
      onSpreadModeChange={function saveSpreadMode(from, value) {
        savedChanges.push([`spreadMode`, from, value])
        setSpreadMode(value)
      }}
      theme={theme}
      onThemeChange={function saveTheme(from, value) {
        savedChanges.push([`theme`, from, value])
        setTheme(value)
      }}
    >
      <SyncReaderWithManagedSettingsProbe />
    </ReactReaderProvider>
  )
}

describe(`useSyncReaderWithManagedSettings`, () => {
  let root: ReturnType<typeof createRoot>

  const render = async (
    props: Omit<ComponentProps<typeof ReactReaderProvider>, "children">,
  ) => {
    await act(async () => {
      root.render(
        <ReactReaderProvider {...props}>
          <SyncReaderWithManagedSettingsProbe />
        </ReactReaderProvider>,
      )
    })
  }

  const waitForWrites = async (durationMs: number) => {
    await act(async () => {
      vi.advanceTimersByTime(durationMs)
    })
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    vi.useFakeTimers()
    root = createRoot(document.createElement(`div`))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.useRealTimers()
  })

  it(`keeps the app's values when the reader arrives holding others`, async () => {
    const reader = createReaderWithSettings({
      fontScale: 1,
      spreadMode: `auto`,
      theme: `bright`,
    })
    const savedChanges: SavedChange[] = []
    const renderApp = async () => {
      await act(async () => {
        root.render(
          <AppSavingEveryChange
            initialFontSize={1.5}
            initialSpreadMode="never"
            initialTheme="night"
            savedChanges={savedChanges}
          />,
        )
      })
    }

    useReaderMock.mockReturnValue(undefined)
    await renderApp()
    useReaderMock.mockReturnValue(reader)
    await renderApp()
    await waitForWrites(200)

    expect(reader.settings.values).toEqual({
      fontScale: 1.5,
      spreadMode: `never`,
      theme: `night`,
    })
    expect(savedChanges).toEqual([])
  })

  it(`writes the app's font size into the reader as its font scale`, async () => {
    const reader = createReaderWithSettings()
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, fontSize: 1.5 })
    await waitForWrites(200)

    expect(reader.settings.values.fontScale).toBe(1.5)
  })

  it(`writes the app's spread mode into the reader once it has stayed 200 ms`, async () => {
    const reader = createReaderWithSettings()
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, spreadMode: `never` })
    await waitForWrites(150)

    expect(reader.settings.values.spreadMode).toBe(`auto`)

    await waitForWrites(50)

    expect(reader.settings.values.spreadMode).toBe(`never`)
  })

  it(`reports a spread mode set on the reader directly as an internal change`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `never` })
    const onSpreadModeChange = vi.fn()
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, spreadMode: `never`, onSpreadModeChange })
    await act(async () => {
      reader.settings.update({ spreadMode: `always` })
    })

    expect(onSpreadModeChange).toHaveBeenCalledWith(`internal`, `always`)
  })

  it(`keeps the spread mode the reader was created with when the app passes none`, async () => {
    const reader = createReaderWithSettings({ spreadMode: `always` })
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined })
    await waitForWrites(500)

    expect(reader.settings.values.spreadMode).toBe(`always`)
    expect(reader.settings.update).not.toHaveBeenCalledWith({
      spreadMode: `auto`,
    })
  })

  it(`reports a theme set on the reader directly as an internal change`, async () => {
    const reader = createReaderWithSettings({ theme: `night` })
    const onThemeChange = vi.fn()
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, theme: `night`, onThemeChange })
    await act(async () => {
      reader.settings.update({ theme: `sepia` })
    })

    expect(onThemeChange.mock.calls).toEqual([[`internal`, `sepia`]])
  })

  it(`keeps the theme the reader was created with when the app passes none`, async () => {
    const reader = createReaderWithSettings({ theme: `night` })
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined })
    await waitForWrites(500)

    expect(reader.settings.values.theme).toBe(`night`)
    expect(reader.settings.update).not.toHaveBeenCalledWith({
      theme: `bright`,
    })
  })
})
