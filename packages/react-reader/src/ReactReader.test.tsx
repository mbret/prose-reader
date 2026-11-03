/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createReader, type Manifest } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { Activity, act, type ReactNode, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { filter, map, of } from "rxjs"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest"
import { useReader } from "./context/useReader"
import { ReactReader } from "./ReactReader"
import type { ReactReaderSettings } from "./settings/managedSettings"
import { setWindowWidth } from "./tests/setWindowWidth"

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

const createReaderFactory = (creationSettings: ReactReaderSettings = {}) => {
  const onMounted = vi.fn()
  const onDestroyed = vi.fn()
  const createOnePageReader = vi.fn(function createOnePageReader() {
    const reader = createAppReader({
      manifest: ONE_PAGE_MANIFEST,
      getResource: () => of(new Response(``)),
      ...creationSettings,
    })

    reader.mounted$
      .pipe(
        filter(Boolean),
        map(function readManagedSettings() {
          const { fontScale, spreadMode, theme } = reader.settings.values

          return { fontScale, spreadMode, theme }
        }),
      )
      .subscribe(onMounted)
    reader.$.destroy$.subscribe(function reportDestroyed() {
      onDestroyed(reader)
    })

    return reader
  })

  const getCreatedReaders = (): AppReader[] =>
    createOnePageReader.mock.results.map(({ value }) => value)

  return { createOnePageReader, onMounted, onDestroyed, getCreatedReaders }
}

const nameReaders = (
  calls: unknown[][],
  readers: Record<string, AppReader | undefined>,
) =>
  calls.map(function nameReader([reader]) {
    if (reader === undefined) return undefined

    const [name = `an unknown reader`] =
      Object.entries(readers).find(([, known]) => known === reader) ?? []

    return name
  })

const DEFAULT_WINDOW_WIDTH = window.innerWidth

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

  const setWindowWidthForTest = (width: number) => {
    setWindowWidth(width)
    onTestFinished(function restoreWindowWidth() {
      setWindowWidth(DEFAULT_WINDOW_WIDTH)
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

  it(`mounts the reader it creates on the settings it manages, in its element`, async () => {
    const { createOnePageReader, onMounted, getCreatedReaders } =
      createReaderFactory()
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
      settingsWhenMounted: onMounted.mock.calls,
      isReaderElementInReactReader: isElementInReactReader(
        reader?.context.value.rootElement,
      ),
    }).toEqual({
      settingsWhenMounted: [[appSettings]],
      isReaderElementInReactReader: true,
    })
  })

  it(`leaves a setting the app gives no value on the value the reader was created with`, async () => {
    const { createOnePageReader, onMounted } = createReaderFactory({
      theme: `sepia`,
    })

    await render(
      <ReactReader
        createReader={createOnePageReader}
        settings={{ fontScale: 1.5 }}
      />,
    )

    expect(onMounted.mock.calls).toEqual([
      [{ fontScale: 1.5, spreadMode: `auto`, theme: `sepia` }],
    ])
  })

  it(`mounts the reader on the value of a setting's screen scope`, async () => {
    const { createOnePageReader, onMounted } = createReaderFactory()

    setWindowWidthForTest(1400)
    await render(
      <ReactReader
        createReader={createOnePageReader}
        settingsScopes={{ spreadMode: `screen` }}
        settingsByScope={{ desktop: { spreadMode: `always` } }}
      />,
    )

    expect(onMounted.mock.calls).toEqual([
      [expect.objectContaining({ spreadMode: `always` })],
    ])
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
      readerChanges: nameReaders(onReaderChange.mock.calls, { reader }),
      destroyed: nameReaders(onDestroyed.mock.calls, { reader }),
      isDestroyedBeforeReported: Number(destroyedAt) < Number(readerGoneAt),
    }).toEqual({
      readerChanges: [`reader`, undefined],
      destroyed: [`reader`],
      isDestroyedBeforeReported: true,
    })
  })

  it(`creates a new reader, on the settings of the same render, once it destroyed the previous one`, async () => {
    const firstBook = createReaderFactory()
    const secondBook = createReaderFactory()
    const onReaderChange = vi.fn()
    const secondBookSettings = {
      fontScale: 2,
      spreadMode: `always`,
      theme: `sepia`,
    } satisfies ReactReaderSettings

    await render(
      <ReactReader
        createReader={firstBook.createOnePageReader}
        onReaderChange={onReaderChange}
        settings={{ fontScale: 1.5, spreadMode: `never`, theme: `night` }}
      />,
    )
    await render(
      <ReactReader
        createReader={secondBook.createOnePageReader}
        onReaderChange={onReaderChange}
        settings={secondBookSettings}
      />,
    )
    const [firstReader] = firstBook.getCreatedReaders()
    const [secondReader] = secondBook.getCreatedReaders()
    const [firstDestroyedAt] = firstBook.onDestroyed.mock.invocationCallOrder
    const [secondCreatedAt] =
      secondBook.createOnePageReader.mock.invocationCallOrder

    expect({
      readerChanges: nameReaders(onReaderChange.mock.calls, {
        firstReader,
        secondReader,
      }),
      secondBookSettingsWhenMounted: secondBook.onMounted.mock.calls,
      isFirstDestroyedBeforeSecondCreated:
        Number(firstDestroyedAt) < Number(secondCreatedAt),
      isSecondElementInReactReader: isElementInReactReader(
        secondReader?.context.value.rootElement,
      ),
    }).toEqual({
      readerChanges: [`firstReader`, undefined, `secondReader`],
      secondBookSettingsWhenMounted: [[secondBookSettings]],
      isFirstDestroyedBeforeSecondCreated: true,
      isSecondElementInReactReader: true,
    })
  })

  it(`mounts the next reader on the values react-reader kept as its own`, async () => {
    const firstBook = createReaderFactory()
    const secondBook = createReaderFactory()

    await render(<ReactReader createReader={firstBook.createOnePageReader} />)
    const [firstReader] = firstBook.getCreatedReaders()
    await act(async () => {
      firstReader?.settings.update({ theme: `night` })
    })
    await render(<ReactReader createReader={secondBook.createOnePageReader} />)

    expect(secondBook.onMounted.mock.calls).toEqual([
      [expect.objectContaining({ theme: `night` })],
    ])
  })

  it(`keeps the reader when the app passes another onReaderChange`, async () => {
    const { createOnePageReader, onDestroyed } = createReaderFactory()

    await render(
      <ReactReader
        createReader={createOnePageReader}
        onReaderChange={function keepReader() {}}
      />,
    )
    await render(
      <ReactReader
        createReader={createOnePageReader}
        onReaderChange={function keepReaderAgain() {}}
      />,
    )

    expect({
      creations: createOnePageReader.mock.calls.length,
      destroyed: nameReaders(onDestroyed.mock.calls, {}),
    }).toEqual({ creations: 1, destroyed: [] })
  })

  it(`keeps the reader when the window crosses a breakpoint`, async () => {
    const { createOnePageReader, onDestroyed } = createReaderFactory()

    setWindowWidthForTest(800)
    await render(<ReactReader createReader={createOnePageReader} />)
    await act(async () => {
      setWindowWidth(1400)
    })

    expect({
      creations: createOnePageReader.mock.calls.length,
      destroyed: nameReaders(onDestroyed.mock.calls, {}),
    }).toEqual({ creations: 1, destroyed: [] })
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
      destroyed: nameReaders(onDestroyed.mock.calls, {
        strictModeReader,
        liveReader,
      }),
      isLiveReaderElementInReactReader: isElementInReactReader(
        liveReader?.context.value.rootElement,
      ),
    }).toEqual({
      creations: 2,
      destroyed: [`strictModeReader`],
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
      destroyed: nameReaders(onDestroyed.mock.calls, {
        hiddenReader,
        shownReader,
      }),
      isShownReaderElementInReactReader: isElementInReactReader(
        shownReader?.context.value.rootElement,
      ),
    }).toEqual({
      destroyed: [`hiddenReader`],
      isShownReaderElementInReactReader: true,
    })
  })

  it(`destroys the reader and stops using it when createReader goes back to undefined`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const onReaderChange = vi.fn()
    const onReaderRendered = vi.fn()

    function ReaderUser() {
      onReaderRendered(useReader())

      return null
    }

    await render(
      <ReactReader
        createReader={createOnePageReader}
        onReaderChange={onReaderChange}
      >
        <ReaderUser />
      </ReactReader>,
    )
    await render(
      <ReactReader onReaderChange={onReaderChange}>
        <ReaderUser />
      </ReactReader>,
    )
    const [reader] = getCreatedReaders()

    expect({
      readerChanges: nameReaders(onReaderChange.mock.calls, { reader }),
      destroyed: nameReaders(onDestroyed.mock.calls, { reader }),
      readerLastRendered: nameReaders(onReaderRendered.mock.calls, {
        reader,
      }).at(-1),
    }).toEqual({
      readerChanges: [`reader`, undefined],
      destroyed: [`reader`],
      readerLastRendered: undefined,
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
