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
import { ThemeSection } from "./ThemeSection"

type ReactReaderProviderProps = Omit<
  ComponentProps<typeof ReactReaderProvider>,
  "children" | "reader"
>

const createReaderOfBook = ({
  isFullyPrePaginated,
}: {
  isFullyPrePaginated: boolean
}) => ({
  context: { value: { isFullyPrePaginated } },
  settings: { defaults: { fontScale: 1, spreadMode: `auto`, theme: `bright` } },
})

describe(`ThemeSection`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const render = async (props: ReactReaderProviderProps) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReactReaderProvider reader={undefined} {...props}>
            <ThemeSection />
          </ReactReaderProvider>
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
    ].map((radio) => ({
      radio,
      label: radio.closest(`label`)?.textContent,
    }))
  }

  const getShownThemeChoices = () =>
    getShownThemeRadios().map(({ radio, label }) => ({
      label,
      checked: radio.checked,
    }))

  const pickShownThemeChoice = async (pickedLabel: string) => {
    await act(async () => {
      getShownThemeRadios()
        .find(({ label }) => label === pickedLabel)
        ?.radio.click()
    })
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

  it(`offers the theme the global tab inherits first, checked while the tab has no theme of its own, and reports a pick of the theme it names`, async () => {
    const onSettingsChange = vi.fn()

    await render({ defaultSettings: { theme: `night` }, onSettingsChange })
    const shownThemeChoices = getShownThemeChoices()
    await pickShownThemeChoice(`Night`)

    expect({
      shownThemeChoices,
      reported: onSettingsChange.mock.calls,
    }).toEqual({
      shownThemeChoices: [
        { label: `Default (Night)`, checked: true },
        { label: `Bright`, checked: false },
        { label: `Sepia`, checked: false },
        { label: `Night`, checked: false },
        { label: `The book's own colors`, checked: false },
      ],
      reported: [[{ theme: `night` }, `global`]],
    })
  })

  it(`checks the global tab's own theme, and names the reader's default as the one it inherits without defaultSettings`, async () => {
    await render({ settings: { theme: `sepia` } })

    expect(getShownThemeChoices().filter(({ checked }) => checked)).toEqual([
      { label: `Sepia`, checked: true },
    ])
    expect(getShownThemeChoices()[0]?.label).toBe(`Default (Bright)`)
  })

  it(`checks a scope tab's own theme, and reports picking Same as global as undefined with that scope`, async () => {
    const onSettingsChange = vi.fn()

    await render({
      settings: { theme: `night` },
      settingsByScope: { book: { theme: `sepia` } },
      settingsScopes: { theme: `book` },
      onSettingsChange,
    })
    const shownThemeChoices = getShownThemeChoices()
    await pickShownThemeChoice(`Same as global (Night)`)

    expect({
      shownThemeChoices,
      reported: onSettingsChange.mock.calls,
    }).toEqual({
      shownThemeChoices: [
        { label: `Same as global (Night)`, checked: false },
        { label: `Bright`, checked: false },
        { label: `Sepia`, checked: true },
        { label: `Night`, checked: false },
        { label: `The book's own colors`, checked: false },
      ],
      reported: [[{ theme: undefined }, `book`]],
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
