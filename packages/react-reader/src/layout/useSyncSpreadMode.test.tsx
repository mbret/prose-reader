/* @vitest-environment happy-dom */

import type { CoreInputSettings } from "@prose-reader/core"
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { BehaviorSubject } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type SpreadModeSettings = Pick<CoreInputSettings, "spreadMode">

const { useReaderMock } = vi.hoisted(() => ({ useReaderMock: vi.fn() }))

vi.mock("../context/useReader", () => ({ useReader: useReaderMock }))

import { ReactReaderProvider } from "../context/ReactReaderProvider"
import { useSyncSpreadMode } from "./useSyncSpreadMode"

const createReaderWithSpreadMode = (
  spreadMode: CoreInputSettings["spreadMode"],
) => {
  const values$ = new BehaviorSubject<SpreadModeSettings>({ spreadMode })

  return {
    settings: {
      values$,
      get values() {
        return values$.value
      },
      update: vi.fn(function updateSettings(settings: SpreadModeSettings) {
        values$.next({ ...values$.value, ...settings })
      }),
    },
  }
}

const SyncSpreadModeProbe = () => {
  useSyncSpreadMode()

  return null
}

describe(`useSyncSpreadMode`, () => {
  let root: ReturnType<typeof createRoot>

  const render = async (
    props: Omit<ComponentProps<typeof ReactReaderProvider>, "children">,
  ) => {
    await act(async () => {
      root.render(
        <ReactReaderProvider {...props}>
          <SyncSpreadModeProbe />
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

  it(`writes the app's spread mode into the reader once it has stayed 200 ms`, async () => {
    const reader = createReaderWithSpreadMode(`auto`)
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, spreadMode: `never` })
    await waitForWrites(150)

    expect(reader.settings.values.spreadMode).toBe(`auto`)

    await waitForWrites(50)

    expect(reader.settings.values.spreadMode).toBe(`never`)
  })

  it(`reports a spread mode set on the reader directly as an internal change`, async () => {
    const reader = createReaderWithSpreadMode(`never`)
    const onSpreadModeChange = vi.fn()
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined, spreadMode: `never`, onSpreadModeChange })
    await act(async () => {
      reader.settings.update({ spreadMode: `always` })
    })

    expect(onSpreadModeChange).toHaveBeenCalledWith(`internal`, `always`)
  })

  it(`keeps the spread mode the reader was created with when the app passes none`, async () => {
    const reader = createReaderWithSpreadMode(`always`)
    useReaderMock.mockReturnValue(reader)

    await render({ reader: undefined })
    await waitForWrites(500)

    expect(reader.settings.values.spreadMode).toBe(`always`)
    expect(reader.settings.update).not.toHaveBeenCalledWith({
      spreadMode: `auto`,
    })
  })
})
