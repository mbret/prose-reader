/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { Activity, act, type ComponentProps, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ReactReaderProvider } from "./context/ReactReaderProvider"
import { MountReaderWithManagedSettings } from "./MountReaderWithManagedSettings"
import {
  asProvidedReader,
  createTestReader,
  type TestReader,
} from "./tests/createTestReader"

type ReactReaderProviderProps = Omit<
  ComponentProps<typeof ReactReaderProvider>,
  "children" | "reader"
>

describe(`MountReaderWithManagedSettings`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const render = async (element: ReactNode) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>,
      )
    })
  }

  const renderWithReader = (
    reader: TestReader | undefined,
    props: ReactReaderProviderProps = {},
  ) =>
    render(
      <ReactReaderProvider reader={asProvidedReader(reader)} {...props}>
        <MountReaderWithManagedSettings />
      </ReactReaderProvider>,
    )

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

  it(`mounts the reader into its element once the settings it manages are written`, async () => {
    const reader = createTestReader({ settings: { spreadMode: `auto` } })

    await renderWithReader(reader, { settings: { spreadMode: `never` } })

    expect(
      reader.mounts.map(({ element, settings }) => ({
        isElementRendered: container.contains(element),
        settings,
      })),
    ).toEqual([
      {
        isElementRendered: true,
        settings: { fontScale: 1, spreadMode: `never`, theme: `bright` },
      },
    ])
  })

  it(`mounts a reader once when its screen is hidden and shown again`, async () => {
    const reader = createTestReader()
    const renderInActivity = (mode: `visible` | `hidden`) =>
      render(
        <Activity mode={mode}>
          <ReactReaderProvider reader={asProvidedReader(reader)}>
            <MountReaderWithManagedSettings />
          </ReactReaderProvider>
        </Activity>,
      )

    await renderInActivity(`visible`)
    await renderInActivity(`hidden`)
    await renderInActivity(`visible`)

    expect(reader.mounts).toHaveLength(1)
  })

  it(`mounts each reader into an element of its own`, async () => {
    const firstReader = createTestReader()
    const secondReader = createTestReader()

    await renderWithReader(firstReader)
    await renderWithReader(secondReader)
    const [firstMount] = firstReader.mounts
    const [secondMount] = secondReader.mounts

    expect({
      isSecondElementAnother: secondMount?.element !== firstMount?.element,
      isFirstElementRendered: firstMount?.element.isConnected,
      isSecondElementRendered: secondMount?.element.isConnected,
    }).toEqual({
      isSecondElementAnother: true,
      isFirstElementRendered: false,
      isSecondElementRendered: true,
    })
  })

  it(`does not mount a reader destroyed before it was handed over`, async () => {
    const reader = createTestReader()

    reader.destroy()
    await renderWithReader(reader)

    expect(reader.mount).not.toHaveBeenCalled()
  })

  it(`skips a destroyed reader handed to a remounted ReactReader, and mounts the next one`, async () => {
    const firstReader = createTestReader()
    const secondReader = createTestReader()
    const renderForBook = (book: string, reader: TestReader) =>
      render(
        <ReactReaderProvider key={book} reader={asProvidedReader(reader)}>
          <MountReaderWithManagedSettings />
        </ReactReaderProvider>,
      )

    await renderForBook(`first book`, firstReader)
    firstReader.destroy()
    await renderForBook(`second book`, firstReader)
    await renderForBook(`second book`, secondReader)

    expect({
      firstReaderMounts: firstReader.mounts.length,
      secondReaderMounts: secondReader.mounts.length,
    }).toEqual({ firstReaderMounts: 1, secondReaderMounts: 1 })
  })

  it(`refuses a reader the app already mounted elsewhere`, async () => {
    const reader = createTestReader()

    reader.mount(document.createElement(`div`))

    await expect(renderWithReader(reader)).rejects.toThrowError(
      /already mounted elsewhere/,
    )
  })
})
