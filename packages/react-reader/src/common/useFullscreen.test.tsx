/* @vitest-environment happy-dom */

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFullscreen } from "./useFullscreen"

const screenfullMock = vi.hoisted(() => ({
  exit: vi.fn(),
  isEnabled: false,
  isFullscreen: false,
  off: vi.fn(),
  on: vi.fn(),
  request: vi.fn(),
}))

vi.mock(`screenfull`, () => ({
  default: screenfullMock,
}))

const FullscreenProbe = () => {
  const { isFullscreen, isFullscreenSupported, onToggleFullscreenClick } =
    useFullscreen()

  return (
    <button
      data-fullscreen={isFullscreen ? `true` : `false`}
      data-supported={isFullscreenSupported ? `true` : `false`}
      onClick={() => {
        void onToggleFullscreenClick()
      }}
      type="button"
    />
  )
}

describe(`useFullscreen`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const getButton = () => {
    const button = container.querySelector(`button`)

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Fullscreen probe button is missing`)
    }

    return button
  }

  const renderProbe = async () => {
    await act(async () => {
      root.render(<FullscreenProbe />)
    })
  }

  const clickButton = async () => {
    await act(async () => {
      getButton().dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
      await Promise.resolve()
    })
  }

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    })
    screenfullMock.isEnabled = false
    screenfullMock.isFullscreen = false
    vi.clearAllMocks()
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })

    vi.restoreAllMocks()
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    container.remove()
  })

  it(`does not request fullscreen when screenfull reports no support`, async () => {
    await renderProbe()

    expect(getButton().dataset.supported).toBe(`false`)

    await clickButton()

    expect(screenfullMock.request).not.toHaveBeenCalled()
    expect(screenfullMock.exit).not.toHaveBeenCalled()
  })

  it(`requests and exits fullscreen through screenfull`, async () => {
    screenfullMock.isEnabled = true
    screenfullMock.request.mockImplementation(async () => {
      screenfullMock.isFullscreen = true
    })
    screenfullMock.exit.mockImplementation(async () => {
      screenfullMock.isFullscreen = false
    })

    await renderProbe()

    expect(getButton().dataset.supported).toBe(`true`)
    expect(getButton().dataset.fullscreen).toBe(`false`)

    await clickButton()

    expect(screenfullMock.request).toHaveBeenCalledWith(
      document.documentElement,
      { navigationUI: `hide` },
    )
    expect(getButton().dataset.fullscreen).toBe(`true`)

    await clickButton()

    expect(screenfullMock.exit).toHaveBeenCalled()
    expect(getButton().dataset.fullscreen).toBe(`false`)
  })

  it(`keeps state unchanged when a fullscreen request is rejected`, async () => {
    const requestError = new Error(`Fullscreen denied`)
    const consoleError = vi.spyOn(console, `error`).mockImplementation(() => {})

    screenfullMock.isEnabled = true
    screenfullMock.request.mockRejectedValue(requestError)

    await renderProbe()
    await clickButton()

    expect(consoleError).toHaveBeenCalledWith(requestError)
    expect(getButton().dataset.fullscreen).toBe(`false`)
  })

  it(`syncs fullscreen state from screenfull change events`, async () => {
    screenfullMock.isEnabled = true

    await renderProbe()

    const changeHandler = screenfullMock.on.mock.calls.find(
      ([eventName]) => eventName === `change`,
    )?.[1]

    if (typeof changeHandler !== `function`) {
      throw new Error(`Fullscreen change handler is missing`)
    }

    await act(async () => {
      screenfullMock.isFullscreen = true
      changeHandler(new Event(`fullscreenchange`))
    })

    expect(getButton().dataset.fullscreen).toBe(`true`)
  })
})
