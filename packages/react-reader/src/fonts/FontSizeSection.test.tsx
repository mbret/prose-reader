/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { useReaderMock } = vi.hoisted(() => ({ useReaderMock: vi.fn() }))

vi.mock("../context/useReader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../context/useReader")>()),
  useReader: useReaderMock,
}))

import { ReactReaderProvider } from "../context/ReactReaderProvider"
import { FontSizeSection } from "./FontSizeSection"

type ReactReaderProviderProps = Omit<
  ComponentProps<typeof ReactReaderProvider>,
  "children" | "reader"
>

describe(`FontSizeSection`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const render = async (props: ReactReaderProviderProps) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReactReaderProvider reader={undefined} {...props}>
            <FontSizeSection />
          </ReactReaderProvider>
        </ChakraProvider>,
      )
    })
  }

  /** Every scope tab stays mounted, so the hidden tabs hold a font size too. */
  const getShownFontSize = () => {
    const shownPanel = container.querySelector(
      `[role="tabpanel"]:not([hidden])`,
    )
    const inheritedChoice = shownPanel?.querySelector<HTMLInputElement>(
      `input[type="checkbox"]`,
    )

    return {
      inheritedChoice,
      inheritedChoiceLabel: inheritedChoice?.closest(`label`)?.textContent,
      isInheritedChoiceChecked: inheritedChoice?.checked,
      sliderPercent: shownPanel
        ?.querySelector(`[role="slider"]`)
        ?.getAttribute(`aria-valuenow`),
    }
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
    useReaderMock.mockReturnValue({
      settings: {
        defaults: { fontScale: 1, spreadMode: `auto`, theme: `bright` },
      },
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it(`shows a scope tab without a font size of its own at the one it inherits, and keeps that font size as the tab's own once the box is unchecked`, async () => {
    const onSettingsChange = vi.fn()

    await render({
      settings: { fontScale: 1.2 },
      settingsScopes: { fontScale: `book` },
      onSettingsChange,
    })
    const { inheritedChoice, ...shownFontSize } = getShownFontSize()
    await act(async () => {
      inheritedChoice?.click()
    })

    expect({ shownFontSize, reported: onSettingsChange.mock.calls }).toEqual({
      shownFontSize: {
        inheritedChoiceLabel: `Same as global (120%)`,
        isInheritedChoiceChecked: true,
        sliderPercent: `120`,
      },
      reported: [[{ fontScale: 1.2 }, `book`]],
    })
  })

  it(`sets a scope tab with a font size of its own, even the one it inherits, back to inheriting once the box is checked`, async () => {
    const onSettingsChange = vi.fn()

    await render({
      settings: { fontScale: 1.2 },
      settingsByScope: { book: { fontScale: 1.2 } },
      settingsScopes: { fontScale: `book` },
      onSettingsChange,
    })
    const { inheritedChoice, ...shownFontSize } = getShownFontSize()
    await act(async () => {
      inheritedChoice?.click()
    })

    expect({ shownFontSize, reported: onSettingsChange.mock.calls }).toEqual({
      shownFontSize: {
        inheritedChoiceLabel: `Same as global (120%)`,
        isInheritedChoiceChecked: false,
        sliderPercent: `120`,
      },
      reported: [[{ fontScale: undefined }, `book`]],
    })
  })

  it(`names the reader's default as the font size the global tab inherits`, async () => {
    await render({ settings: { fontScale: 1.2 } })

    expect(getShownFontSize().inheritedChoiceLabel).toBe(`Default (100%)`)
  })
})
