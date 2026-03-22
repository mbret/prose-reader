/* @vitest-environment happy-dom */

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { audioWaveCanvasMock, createPortalMock, useObserveMock, useReaderMock } =
  vi.hoisted(() => ({
    audioWaveCanvasMock: vi.fn((_props?: unknown) => (
      <div data-testid="audio-wave-canvas" />
    )),
    createPortalMock: vi.fn((node, _container) => node),
    useObserveMock: vi.fn(),
    useReaderMock: vi.fn(),
  }))

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom")

  return {
    ...actual,
    createPortal: createPortalMock,
  }
})

vi.mock("reactjrx", () => ({
  useObserve: useObserveMock,
}))

vi.mock("../context/useReader", () => ({
  hasAudioEnhancer: (reader: unknown) =>
    !!reader &&
    typeof reader === `object` &&
    `__PROSE_READER_ENHANCER_AUDIO` in reader,
  useReader: useReaderMock,
}))

vi.mock("./wave/AudioWaveCanvas", () => ({
  AudioWaveCanvas: audioWaveCanvasMock,
}))

import { AudioSpineItem } from "./AudioSpineItem"

const createSpineItem = () => {
  const renderer = {
    watch: vi.fn(),
  }

  return {
    item: {
      id: `track-1`,
    },
    renderer,
  }
}

const createAudioReader = () => ({
  __PROSE_READER_ENHANCER_AUDIO: true as const,
  audio: {
    isAudioRenderer: vi.fn(() => true),
    state$: {},
    visualizer$: {},
  },
})

describe(`AudioSpineItem`, () => {
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
    useObserveMock.mockReset()
    useReaderMock.mockReset()
    audioWaveCanvasMock.mockClear()
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

  it(`does not render the wave canvas before the audio container is ready`, async () => {
    useReaderMock.mockReturnValue(createAudioReader())
    useObserveMock
      .mockReturnValueOnce({
        data: undefined,
      })
      .mockReturnValueOnce({
        data: false,
      })
      .mockReturnValueOnce({
        data: undefined,
      })

    const item = createSpineItem()

    await act(async () => {
      // Type assertion is required because this component reads only a tiny SpineItem subset in this test.
      root.render(
        <AudioSpineItem
          item={item as unknown as Parameters<typeof AudioSpineItem>[0][`item`]}
        />,
      )
    })

    expect(createPortalMock).not.toHaveBeenCalled()
    expect(audioWaveCanvasMock).not.toHaveBeenCalled()
  })

  it(`renders the default wave for a loaded item that is not the current track`, async () => {
    const audioDocumentContainer = document.createElement(`div`)

    useReaderMock.mockReturnValue(createAudioReader())
    useObserveMock
      .mockReturnValueOnce({
        data: audioDocumentContainer,
      })
      .mockReturnValueOnce({
        data: false,
      })
      .mockReturnValueOnce({
        data: undefined,
      })

    const item = createSpineItem()

    await act(async () => {
      // Type assertion is required because this component reads only a tiny SpineItem subset in this test.
      root.render(
        <AudioSpineItem
          item={item as unknown as Parameters<typeof AudioSpineItem>[0][`item`]}
        />,
      )
    })

    expect(createPortalMock).toHaveBeenCalledTimes(1)
    expect(createPortalMock.mock.calls[0]?.[1]).toBe(audioDocumentContainer)
    expect(audioWaveCanvasMock).toHaveBeenCalledTimes(1)
    expect(audioWaveCanvasMock.mock.calls[0]?.[0]).toEqual({
      visualizer: undefined,
    })
  })

  it(`renders the visualizer through the renderer portal when available`, async () => {
    const audioDocumentContainer = document.createElement(`div`)
    const visualizer = {
      levels: [0.5, 0.25],
      isActive: true,
      trackId: `track-1`,
    }

    useReaderMock.mockReturnValue(createAudioReader())
    useObserveMock
      .mockReturnValueOnce({
        data: audioDocumentContainer,
      })
      .mockReturnValueOnce({
        data: true,
      })
      .mockReturnValueOnce({
        data: visualizer,
      })

    const item = createSpineItem()

    await act(async () => {
      // Type assertion is required because this component reads only a tiny SpineItem subset in this test.
      root.render(
        <AudioSpineItem
          item={item as unknown as Parameters<typeof AudioSpineItem>[0][`item`]}
        />,
      )
    })

    expect(createPortalMock).toHaveBeenCalledTimes(1)
    expect(createPortalMock.mock.calls[0]?.[1]).toBe(audioDocumentContainer)
    expect(audioWaveCanvasMock).toHaveBeenCalledTimes(1)
    expect(audioWaveCanvasMock.mock.calls[0]?.[0]).toEqual({
      visualizer,
    })
  })
})
