/* @vitest-environment happy-dom */

import { act } from "react"
import { describe, expect, it, vi } from "vitest"
import { MAX_ZOOM_SCALE } from "./constants"
import { useReaderViewContext } from "./context/ReaderViewContext"
import { ReactReader } from "./ReactReader"
import { createMountedReader } from "./tests/createMountedReader"
import { setUpRenderRoot } from "./tests/setUpRenderRoot"

function QuickMenuToggle({
  onQuickMenuRendered,
}: {
  onQuickMenuRendered?: (quickMenuOpen: boolean) => void
}) {
  const { quickMenuOpen, onQuickMenuOpenChange } = useReaderViewContext()

  onQuickMenuRendered?.(quickMenuOpen)

  return (
    <button
      type="button"
      data-toggle-quick-menu
      onClick={function toggleQuickMenu() {
        onQuickMenuOpenChange((open) => !open)
      }}
    />
  )
}

describe(`ReactReader`, () => {
  const { render, getContainer } = setUpRenderRoot()

  const clickQuickMenuToggle = () =>
    act(async () => {
      getContainer()
        .querySelector<HTMLButtonElement>(`[data-toggle-quick-menu]`)
        ?.click()
    })

  it(`puts back the default of a prop the app stops passing`, async () => {
    const reader = createMountedReader()

    await render(
      <ReactReader reader={reader} zoomMaxScale={3}>
        {null}
      </ReactReader>,
    )
    const zoomMaxScaleWhenPassed = reader.gestures.settings.values.zoomMaxScale
    await render(<ReactReader reader={reader}>{null}</ReactReader>)

    expect({
      zoomMaxScaleWhenPassed,
      zoomMaxScaleOnceDropped: reader.gestures.settings.values.zoomMaxScale,
    }).toEqual({
      zoomMaxScaleWhenPassed: 3,
      zoomMaxScaleOnceDropped: MAX_ZOOM_SCALE,
    })
  })

  it(`opens its own quick menu unless the app controls it`, async () => {
    const reader = createMountedReader()
    const onQuickMenuRendered = vi.fn<(quickMenuOpen: boolean) => void>()
    const onAppQuickMenuOpenChange = vi.fn()

    await render(
      <ReactReader key="own" reader={reader}>
        <QuickMenuToggle onQuickMenuRendered={onQuickMenuRendered} />
      </ReactReader>,
    )
    await clickQuickMenuToggle()
    const ownQuickMenuOpen = onQuickMenuRendered.mock.lastCall?.[0]
    await render(
      <ReactReader
        key="app"
        reader={reader}
        quickMenuOpen
        onQuickMenuOpenChange={onAppQuickMenuOpenChange}
      >
        <QuickMenuToggle onQuickMenuRendered={onQuickMenuRendered} />
      </ReactReader>,
    )
    await clickQuickMenuToggle()

    expect({
      ownQuickMenuOpen,
      appQuickMenuOpen: onQuickMenuRendered.mock.lastCall?.[0],
      appQuickMenuOpenChanges: onAppQuickMenuOpenChange.mock.calls,
    }).toEqual({
      ownQuickMenuOpen: true,
      appQuickMenuOpen: true,
      appQuickMenuOpenChanges: [[false]],
    })
  })

  it(`hides the floating progress while a quick menu the app does not control is open`, async () => {
    const reader = createMountedReader()
    const getFloatingProgressState = () =>
      [...getContainer().querySelectorAll(`[data-scope="presence"]`)]
        .find((presence) => presence.textContent?.endsWith(` %`))
        ?.getAttribute(`data-state`)

    await render(
      <ReactReader reader={reader}>
        <QuickMenuToggle />
      </ReactReader>,
    )
    const stateWithQuickMenuClosed = getFloatingProgressState()
    await clickQuickMenuToggle()

    expect({
      stateWithQuickMenuClosed,
      stateWithQuickMenuOpen: getFloatingProgressState(),
    }).toEqual({
      stateWithQuickMenuClosed: `open`,
      stateWithQuickMenuOpen: `closed`,
    })
  })

  it(`keeps its own quick menu, and reports each change, when the app only listens to it`, async () => {
    const reader = createMountedReader()
    const onQuickMenuRendered = vi.fn<(quickMenuOpen: boolean) => void>()
    const onAppQuickMenuOpenChange = vi.fn()

    await render(
      <ReactReader
        reader={reader}
        onQuickMenuOpenChange={onAppQuickMenuOpenChange}
      >
        <QuickMenuToggle onQuickMenuRendered={onQuickMenuRendered} />
      </ReactReader>,
    )
    await clickQuickMenuToggle()

    expect({
      quickMenuOpen: onQuickMenuRendered.mock.lastCall?.[0],
      appQuickMenuOpenChanges: onAppQuickMenuOpenChange.mock.calls,
    }).toEqual({
      quickMenuOpen: true,
      appQuickMenuOpenChanges: [[true]],
    })
  })
})
