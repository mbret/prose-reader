/* @vitest-environment happy-dom */

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { audioSpineItemMock, createPortalMock } = vi.hoisted(() => ({
  audioSpineItemMock: vi.fn((_props?: unknown) => (
    <div data-testid="audio-spine-item" />
  )),
  createPortalMock: vi.fn((node, _container) => node),
}))

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom")

  return {
    ...actual,
    createPortal: createPortalMock,
  }
})

vi.mock("../audio/AudioSpineItem", () => ({
  AudioSpineItem: audioSpineItemMock,
}))

import { SpineItem } from "./SpineItem"

const createSpineItem = () => {
  return {
    containerElement: document.createElement(`div`),
    index: 0,
    item: {
      id: `track-1`,
    },
  }
}

describe(`SpineItem`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: true,
    })
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
    createPortalMock.mockClear()
    audioSpineItemMock.mockClear()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    Object.assign(globalThis, {
      IS_REACT_ACT_ENVIRONMENT: false,
    })
    container.remove()
  })

  it(`renders audio overlays through the spine item container portal`, async () => {
    const item = createSpineItem()

    await act(async () => {
      // Type assertion is required because this component reads only a tiny SpineItem subset in this test.
      root.render(
        <SpineItem
          item={item as unknown as Parameters<typeof SpineItem>[0][`item`]}
        />,
      )
    })

    expect(createPortalMock).toHaveBeenCalledTimes(1)
    expect(createPortalMock.mock.calls[0]?.[1]).toBe(item.containerElement)
    expect(audioSpineItemMock).toHaveBeenCalledTimes(1)
    expect(audioSpineItemMock.mock.calls[0]?.[0]).toEqual({
      item,
    })
  })
})
