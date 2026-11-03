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

import { ReaderContextProvider } from "../context/ReaderContextProvider"
import { ThemeSection } from "./ThemeSection"

type ReaderContextProviderProps = Omit<
  ComponentProps<typeof ReaderContextProvider>,
  "children"
>

const createReaderOfBook = ({
  isFullyPrePaginated,
}: {
  isFullyPrePaginated: boolean
}) => ({ context: { value: { isFullyPrePaginated } } })

describe(`ThemeSection`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const render = async (props: ReaderContextProviderProps) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReaderContextProvider {...props}>
            <ThemeSection />
          </ReaderContextProvider>
        </ChakraProvider>,
      )
    })
  }

  /** Every scope tab stays mounted, so the hidden tabs hold radios too. */
  const getShownThemeRadios = () => {
    const shownPanel = container.querySelector(
      `[role="tabpanel"]:not([hidden])`,
    )

    return [
      ...(shownPanel?.querySelectorAll<HTMLInputElement>(
        `input[type="radio"]`,
      ) ?? []),
    ]
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
    useReaderMock.mockReturnValue(
      createReaderOfBook({ isFullyPrePaginated: false }),
    )
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it(`shows the themes with its scope's value checked, and reports a pick with that scope`, async () => {
    const onSettingsChange = vi.fn()

    await render({
      settings: { theme: `bright` },
      settingsByScope: { book: { theme: `sepia` } },
      settingsScopes: { theme: `book` },
      onSettingsChange,
    })

    const shownThemes = getShownThemeRadios().map(({ value, checked }) => ({
      value,
      checked,
    }))

    await act(async () => {
      getShownThemeRadios()
        .find(({ value }) => value === `night`)
        ?.click()
    })

    expect({ shownThemes, reported: onSettingsChange.mock.calls }).toEqual({
      shownThemes: [
        { value: `bright`, checked: false },
        { value: `sepia`, checked: true },
        { value: `night`, checked: false },
        { value: `publisher`, checked: false },
      ],
      reported: [[{ theme: `night` }, `book`]],
    })
  })

  it.each([
    { isFullyPrePaginated: false, isHelperShown: false },
    { isFullyPrePaginated: true, isHelperShown: true },
  ])(
    `says a book keeps its own colors only when it is fully pre-paginated ($isFullyPrePaginated)`,
    async ({ isFullyPrePaginated, isHelperShown }) => {
      useReaderMock.mockReturnValue(createReaderOfBook({ isFullyPrePaginated }))

      await render({})

      expect(
        container.textContent?.includes(`This book keeps its own colors`),
      ).toBe(isHelperShown)
    },
  )
})
