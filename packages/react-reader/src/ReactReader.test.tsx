/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createReader, type Manifest } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { Activity, act, type ReactNode, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { of } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReactReader } from "./ReactReader"
import type { ReactReaderSettings } from "./settings/managedSettings"

const ONE_PAGE_MANIFEST: Manifest = {
  filename: `comic`,
  mediaType: `application/epub+zip`,
  title: `comic`,
  renditionLayout: `pre-paginated`,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  spineItems: [
    {
      id: `page-1`,
      href: `/page_1.jpg`,
      containerUri: `page_1.jpg`,
      index: 0,
      renditionLayout: `pre-paginated`,
      progressionWeight: 0,
    },
  ],
  items: [],
}

const createAppReader = gesturesEnhancer(createReader)

type AppReader = ReturnType<typeof createAppReader>

/**
 * A `createReader` for ReactReader that creates one-page readers, and an
 * `onDestroyed` that each reader calls when it is destroyed.
 */
const createReaderFactory = () => {
  const onDestroyed = vi.fn()
  const createOnePageReader = vi.fn(function createOnePageReader(
    settings: ReactReaderSettings,
  ) {
    const reader = createAppReader({
      manifest: ONE_PAGE_MANIFEST,
      getResource: () => of(new Response(``)),
      ...settings,
    })

    reader.context.destroy$.subscribe(function reportDestroyed() {
      onDestroyed(reader)
    })

    return reader
  })

  const getCreatedReaders = (): AppReader[] =>
    createOnePageReader.mock.results.map(({ value }) => value)

  return { createOnePageReader, onDestroyed, getCreatedReaders }
}

describe(`ReactReader`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderRoot = async (rootElement: ReactNode) => {
    await act(async () => {
      root.render(rootElement)
    })
  }

  const render = (element: ReactNode) =>
    renderRoot(<ChakraProvider value={defaultSystem}>{element}</ChakraProvider>)

  const isElementInReactReader = (element: HTMLElement | undefined) =>
    container
      .querySelector(`[data-prose-react-reader]`)
      ?.contains(element ?? null) ?? false

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

  it(`creates the reader with the settings it manages, and mounts it into its element`, async () => {
    const { createOnePageReader, getCreatedReaders } = createReaderFactory()
    const appSettings = {
      fontScale: 1.5,
      spreadMode: `never`,
      theme: `night`,
    } satisfies ReactReaderSettings

    await render(
      <ReactReader createReader={createOnePageReader} settings={appSettings} />,
    )
    const [reader] = getCreatedReaders()

    expect({
      creations: createOnePageReader.mock.calls,
      isReaderElementInReactReader: isElementInReactReader(
        reader?.context.value.rootElement,
      ),
    }).toEqual({
      creations: [[appSettings]],
      isReaderElementInReactReader: true,
    })
  })

  it(`keeps the reader it created on the settings the app changes`, async () => {
    const { createOnePageReader, getCreatedReaders } = createReaderFactory()

    await render(
      <ReactReader
        createReader={createOnePageReader}
        settings={{ fontScale: 1.5 }}
      />,
    )
    await render(
      <ReactReader
        createReader={createOnePageReader}
        settings={{ fontScale: 2 }}
      />,
    )
    const [reader] = getCreatedReaders()

    expect({
      creations: createOnePageReader.mock.calls.length,
      fontScale: reader?.settings.values.fontScale,
    }).toEqual({ creations: 1, fontScale: 2 })
  })

  it(`hands the reader to onReaderChange, then undefined once it destroyed it on unmount`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const onReaderChange = vi.fn()

    await render(
      <ReactReader
        createReader={createOnePageReader}
        onReaderChange={onReaderChange}
      />,
    )
    await render(null)
    const [reader] = getCreatedReaders()
    const [destroyedAt] = onDestroyed.mock.invocationCallOrder
    const [, readerGoneAt] = onReaderChange.mock.invocationCallOrder

    expect({
      readerChanges: onReaderChange.mock.calls,
      destroyed: onDestroyed.mock.calls,
      isDestroyedBeforeReported: Number(destroyedAt) < Number(readerGoneAt),
    }).toEqual({
      readerChanges: [[reader], [undefined]],
      destroyed: [[reader]],
      isDestroyedBeforeReported: true,
    })
  })

  it(`creates a new reader, on the settings of the same render, once it destroyed the previous one`, async () => {
    const firstBook = createReaderFactory()
    const secondBook = createReaderFactory()
    const secondBookSettings = {
      fontScale: 2,
      spreadMode: `always`,
      theme: `sepia`,
    } satisfies ReactReaderSettings

    await render(
      <ReactReader
        createReader={firstBook.createOnePageReader}
        settings={{ fontScale: 1.5, spreadMode: `never`, theme: `night` }}
      />,
    )
    await render(
      <ReactReader
        createReader={secondBook.createOnePageReader}
        settings={secondBookSettings}
      />,
    )
    const [secondReader] = secondBook.getCreatedReaders()
    const [firstDestroyedAt] = firstBook.onDestroyed.mock.invocationCallOrder
    const [secondCreatedAt] =
      secondBook.createOnePageReader.mock.invocationCallOrder

    expect({
      secondBookCreations: secondBook.createOnePageReader.mock.calls,
      isFirstDestroyedBeforeSecondCreated:
        Number(firstDestroyedAt) < Number(secondCreatedAt),
      isSecondElementInReactReader: isElementInReactReader(
        secondReader?.context.value.rootElement,
      ),
    }).toEqual({
      secondBookCreations: [[secondBookSettings]],
      isFirstDestroyedBeforeSecondCreated: true,
      isSecondElementInReactReader: true,
    })
  })

  it(`keeps one live reader when strict mode runs its effect twice`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()

    await renderRoot(
      <StrictMode>
        <ChakraProvider value={defaultSystem}>
          <ReactReader createReader={createOnePageReader} />
        </ChakraProvider>
      </StrictMode>,
    )
    const [strictModeReader, liveReader] = getCreatedReaders()

    expect({
      creations: createOnePageReader.mock.calls.length,
      destroyed: onDestroyed.mock.calls,
      isLiveReaderElementInReactReader: isElementInReactReader(
        liveReader?.context.value.rootElement,
      ),
    }).toEqual({
      creations: 2,
      destroyed: [[strictModeReader]],
      isLiveReaderElementInReactReader: true,
    })
  })

  it(`destroys the reader while its screen is hidden, and creates a new one when it shows again`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderInActivity = (mode: `visible` | `hidden`) =>
      render(
        <Activity mode={mode}>
          <ReactReader createReader={createOnePageReader} />
        </Activity>,
      )

    await renderInActivity(`visible`)
    await renderInActivity(`hidden`)
    await renderInActivity(`visible`)
    const [hiddenReader, shownReader] = getCreatedReaders()

    expect({
      destroyed: onDestroyed.mock.calls,
      isShownReaderElementInReactReader: isElementInReactReader(
        shownReader?.context.value.rootElement,
      ),
    }).toEqual({
      destroyed: [[hiddenReader]],
      isShownReaderElementInReactReader: true,
    })
  })

  it(`creates no reader until it has createReader`, async () => {
    const { createOnePageReader } = createReaderFactory()
    const onReaderChange = vi.fn()

    await render(<ReactReader onReaderChange={onReaderChange} />)
    const readerChangesWithoutCreateReader = [...onReaderChange.mock.calls]
    await render(
      <ReactReader
        createReader={createOnePageReader}
        onReaderChange={onReaderChange}
      />,
    )

    expect({
      readerChangesWithoutCreateReader,
      creations: createOnePageReader.mock.calls.length,
    }).toEqual({ readerChangesWithoutCreateReader: [], creations: 1 })
  })
})
