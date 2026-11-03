/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../pagination/usePagination", () => ({
  usePagination: () => ({ percentageEstimateOfBook: 0.5 }),
}))

import {
  ReaderViewContext,
  type ReaderViewContextType,
} from "../context/ReaderViewContext"
import { FloatingProgress } from "./FloatingProgress"

const createReaderView = (quickMenuOpen: boolean): ReaderViewContextType => ({
  enableFloatingTime: undefined,
  enableFloatingProgress: true,
  onItemClick: undefined,
  quickMenuOpen,
  onQuickMenuOpenChange: () => {},
  fontSizeMenuOpen: false,
  onFontSizeMenuOpenChange: () => {},
  refitMenuOpen: false,
  onRefitMenuOpenChange: () => {},
})

describe(`FloatingProgress`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderWithQuickMenuOpen = async (quickMenuOpen: boolean) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReaderViewContext.Provider value={createReaderView(quickMenuOpen)}>
            <FloatingProgress />
          </ReaderViewContext.Provider>
        </ChakraProvider>,
      )
    })

    return container
      .querySelector(`[data-scope="presence"]`)
      ?.getAttribute(`data-state`)
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it(`hides while the quick menu of the view is open`, async () => {
    const stateWithQuickMenuClosed = await renderWithQuickMenuOpen(false)
    const stateWithQuickMenuOpen = await renderWithQuickMenuOpen(true)

    expect({ stateWithQuickMenuClosed, stateWithQuickMenuOpen }).toEqual({
      stateWithQuickMenuClosed: `open`,
      stateWithQuickMenuOpen: `closed`,
    })
  })
})
