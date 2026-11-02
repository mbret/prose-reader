/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { of } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/** The reader the section gets from `useReader`, set before each render. */
const { testReader } = vi.hoisted(() => {
  const testReader: { current: unknown } = { current: undefined }

  return { testReader }
})

vi.mock("../context/useReader", () => ({
  useReader: () => testReader.current,
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
  context: {
    watch: (key: string) =>
      key === `isFullyPrePaginated` ? of(isFullyPrePaginated) : of(undefined),
  },
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

  /** The theme radios of the scope tab on screen; every tab stays mounted. */
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
    testReader.current = createReaderOfBook({ isFullyPrePaginated: false })
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

  it(`says a fully pre-paginated book keeps its own colors, and nothing for another`, async () => {
    const helperText = `This book keeps its own colors`

    await render({})

    const isShownForReflowableBook = container.textContent?.includes(helperText)

    testReader.current = createReaderOfBook({ isFullyPrePaginated: true })
    await act(async () => {
      root.unmount()
    })
    root = createRoot(container)
    await render({})

    expect({
      isShownForReflowableBook,
      isShownForPrePaginatedBook: container.textContent?.includes(helperText),
    }).toEqual({
      isShownForReflowableBook: false,
      isShownForPrePaginatedBook: true,
    })
  })
})
