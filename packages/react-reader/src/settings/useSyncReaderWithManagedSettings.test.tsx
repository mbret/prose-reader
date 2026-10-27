/* @vitest-environment happy-dom */

import type { CoreInputSettings, Theme } from "@prose-reader/core"
import { act, type ComponentProps, useState } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest"

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

/**
 * Each setting react-reader manages, with a value the reader is created with
 * that is not react-reader's own default, and one set on the reader directly.
 */
const managedSettings = [
  {
    setting: `font size`,
    readerCreatedWith: { fontScale: 2 },
    appProps: (onChange: Mock) => ({ fontSize: 2, onFontSizeChange: onChange }),
    setOnReader: { fontScale: 3 },
    reportedChange: [`internal`, 3],
    reactReaderDefault: { fontScale: 1 },
  },
  {
    setting: `spread mode`,
    readerCreatedWith: { spreadMode: `always` },
    appProps: (onChange: Mock) => ({
      spreadMode: `always`,
      onSpreadModeChange: onChange,
    }),
    setOnReader: { spreadMode: `never` },
    reportedChange: [`internal`, `never`],
    reactReaderDefault: { spreadMode: `auto` },
  },
  {
    setting: `theme`,
    readerCreatedWith: { theme: `night` },
    appProps: (onChange: Mock) => ({ theme: `night`, onThemeChange: onChange }),
    setOnReader: { theme: `sepia` },
    reportedChange: [`internal`, `sepia`],
    reactReaderDefault: { theme: `bright` },
  },
] satisfies {
  setting: string
  readerCreatedWith: Partial<ManagedReaderSettings>
  appProps: (
    onChange: Mock,
  ) => Partial<ComponentProps<typeof ReactReaderProvider>>
  setOnReader: Partial<ManagedReaderSettings>
  reportedChange: unknown[]
  reactReaderDefault: Partial<ManagedReaderSettings>
}[]

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

  it(`writes the app's theme into the reader without waiting`, async () => {
    const reader = createReaderWithSettings()
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, theme: `night` })
    await waitForWrites(0)

    expect(reader.settings.values.theme).toBe(`night`)
  })

  describe.each(managedSettings)(
    `the $setting`,
    ({
      readerCreatedWith,
      appProps,
      setOnReader,
      reportedChange,
      reactReaderDefault,
    }) => {
      it(`is reported as an internal change when set on the reader directly`, async () => {
        const reader = createReaderWithSettings(readerCreatedWith)
        const onChange = vi.fn()
        useReaderMock.mockReturnValue(reader)

        await render({ reader: undefined, ...appProps(onChange) })
        await act(async () => {
          reader.settings.update(setOnReader)
        })

        expect(onChange.mock.calls).toEqual([reportedChange])
      })

      it(`stays as the reader was created with when the app passes none`, async () => {
        const reader = createReaderWithSettings(readerCreatedWith)
        useReaderMock.mockReturnValue(reader)

        await render({ reader: undefined })
        await waitForWrites(500)

        expect(reader.settings.values).toEqual(
          expect.objectContaining(readerCreatedWith),
        )
        expect(reader.settings.update).not.toHaveBeenCalledWith(
          reactReaderDefault,
        )
      })
    },
  )
})
