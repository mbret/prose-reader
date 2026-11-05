/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReaderContextProvider } from "../context/ReaderContextProvider"
import {
  asProvidedReader,
  createTestReader,
  type TestReader,
} from "../tests/createTestReader"
import { ReaderInContext } from "../tests/ReaderInContext"
import { FontSizeSection } from "./FontSizeSection"

type ReaderContextProviderProps = Omit<
  ComponentProps<typeof ReaderContextProvider>,
  "children"
>

describe(`FontSizeSection`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderWithReader = async (
    props: ReaderContextProviderProps,
    reader: TestReader | undefined,
  ) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReaderContextProvider {...props}>
            <ReaderInContext reader={asProvidedReader(reader)} />
            <FontSizeSection />
          </ReaderContextProvider>
        </ChakraProvider>,
      )
    })
  }

  const render = (props: ReaderContextProviderProps) =>
    renderWithReader(props, createTestReader())

  /**
   * Every scope tab stays mounted, so the hidden tabs hold a font size too.
   * The box reads Chakra's state: a click toggles the hidden input itself,
   * whatever that state becomes.
   */
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
      isInheritedChoiceChecked:
        inheritedChoice?.closest(`label`)?.dataset.state === `checked`,
      sliderPercent: shownPanel
        ?.querySelector(`[role="slider"]`)
        ?.getAttribute(`aria-valuenow`),
    }
  }

  const toggleShownInheritedChoice = async () => {
    await act(async () => {
      getShownFontSize().inheritedChoice?.click()
    })
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

  it(`keeps the font size a scope tab shows as its own once the box is unchecked, even the one it inherits, and goes back to inheriting once it is checked`, async () => {
    const onSettingsChange = vi.fn()
    const shownFontSizes: Omit<
      ReturnType<typeof getShownFontSize>,
      "inheritedChoice"
    >[] = []
    const recordShownFontSize = () => {
      const { inheritedChoice: _, ...shownFontSize } = getShownFontSize()

      shownFontSizes.push(shownFontSize)
    }

    await render({
      defaultSettings: { fontScale: 1.2 },
      settingsScopes: { fontScale: `book` },
      onSettingsChange,
    })
    recordShownFontSize()
    await toggleShownInheritedChoice()
    recordShownFontSize()
    await toggleShownInheritedChoice()
    recordShownFontSize()

    expect({ shownFontSizes, reported: onSettingsChange.mock.calls }).toEqual({
      shownFontSizes: [
        {
          inheritedChoiceLabel: `Same as global (120%)`,
          isInheritedChoiceChecked: true,
          sliderPercent: `120`,
        },
        {
          inheritedChoiceLabel: `Same as global (120%)`,
          isInheritedChoiceChecked: false,
          sliderPercent: `120`,
        },
        {
          inheritedChoiceLabel: `Same as global (120%)`,
          isInheritedChoiceChecked: true,
          sliderPercent: `120`,
        },
      ],
      reported: [
        [{ fontScale: 1.2 }, `book`],
        [{ fontScale: undefined }, `book`],
      ],
    })
  })

  it(`keeps the box and the slider, at 100%, while there is no reader to give a default`, async () => {
    await renderWithReader({}, undefined)

    const { inheritedChoice: _, ...shownFontSize } = getShownFontSize()

    expect(shownFontSize).toEqual({
      inheritedChoiceLabel: `Default`,
      isInheritedChoiceChecked: true,
      sliderPercent: `100`,
    })
  })

  it(`names the reader's default as the font size the global tab inherits`, async () => {
    await render({ settings: { fontScale: 1.2 } })

    expect(getShownFontSize().inheritedChoiceLabel).toBe(`Default (100%)`)
  })
})
