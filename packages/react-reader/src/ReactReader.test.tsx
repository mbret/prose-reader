/* @vitest-environment happy-dom */

import { act } from "react"
import { describe, expect, it, vi } from "vitest"
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
        onQuickMenuOpenChange(!quickMenuOpen)
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
})
