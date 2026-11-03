/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createReader, type Manifest } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import {
  Activity,
  act,
  type ReactNode,
  StrictMode,
  useEffect,
  useState,
} from "react"
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

const createOnePageReader = () =>
  createAppReader({
    manifest: ONE_PAGE_MANIFEST,
    getResource: () => of(new Response(``)),
  })

const createReaderDestroyedAfterTest = () => {
  const reader = createOnePageReader()

  onTestFinished(function destroyTestReader() {
    reader.destroy()
  })

  return reader
}

const recordManagedSettingsWhenMounted = (reader: AppReader) => {
  const onMounted = vi.fn()

  reader.mounted$
    .pipe(
      filter(Boolean),
      map(() => {
        const { fontScale, spreadMode, theme } = reader.settings.values

        return { fontScale, spreadMode, theme }
      }),
    )
    .subscribe(onMounted)

  return onMounted
}

function AppWithAReaderPerBook({
  book,
  createReaderForBook,
}: {
  book: string
  createReaderForBook: (book: string) => AppReader
}) {
  const [reader, setReader] = useState<AppReader>()

  useEffect(
    function createReaderOfBook() {
      const readerOfBook = createReaderForBook(book)

      setReader(readerOfBook)

      return function destroyReaderOfBook() {
        readerOfBook.destroy()
        setReader(undefined)
      }
    },
    [book, createReaderForBook],
  )

  return <ReactReader key={book} reader={reader} />
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

  const renderInStrictMode = (element: ReactNode) =>
    renderRoot(
      <StrictMode>
        <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>
      </StrictMode>,
    )

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

  it(`mounts the reader it receives into its element, once the settings it manages are written`, async () => {
    const reader = createReaderDestroyedAfterTest()
    const managedSettingsWhenMounted = recordManagedSettingsWhenMounted(reader)
    const appSettings = {
      fontScale: 1.5,
      spreadMode: `never`,
      theme: `night`,
    } satisfies ReactReaderSettings

    await render(<ReactReader reader={reader} settings={appSettings} />)

    expect({
      managedSettingsWhenMounted: managedSettingsWhenMounted.mock.calls,
      isReaderElementInReactReader: isElementInReactReader(
        reader.context.value.rootElement,
      ),
    }).toEqual({
      managedSettingsWhenMounted: [[appSettings]],
      isReaderElementInReactReader: true,
    })
  })

  it(`keeps the reader in the element it mounted it into when its screen is hidden and shown again`, async () => {
    const reader = createReaderDestroyedAfterTest()
    const renderInActivity = (mode: `visible` | `hidden`) =>
      render(
        <Activity mode={mode}>
          <ReactReader reader={reader} />
        </Activity>,
      )

    await renderInActivity(`visible`)
    const mountedElement = reader.context.value.rootElement
    await renderInActivity(`hidden`)

    await expect(renderInActivity(`visible`)).resolves.toBeUndefined()
    expect({
      isSameElement: reader.context.value.rootElement === mountedElement,
      isElementInReactReader: isElementInReactReader(mountedElement),
    }).toEqual({ isSameElement: true, isElementInReactReader: true })
  })

  it(`mounts each reader into an element of its own`, async () => {
    const firstReader = createReaderDestroyedAfterTest()
    const secondReader = createReaderDestroyedAfterTest()

    await render(<ReactReader reader={firstReader} />)
    await render(<ReactReader reader={secondReader} />)
    const firstElement = firstReader.context.value.rootElement
    const secondElement = secondReader.context.value.rootElement

    expect({
      isSecondElementAnother: secondElement !== firstElement,
      isFirstElementInReactReader: isElementInReactReader(firstElement),
      isSecondElementInReactReader: isElementInReactReader(secondElement),
    }).toEqual({
      isSecondElementAnother: true,
      isFirstElementInReactReader: false,
      isSecondElementInReactReader: true,
    })
  })

  it(`mounts each book's reader and never a destroyed one, for an app that creates a reader per book under strict mode`, async () => {
    const createReaderForBook = vi.fn((_book: string) => createOnePageReader())

    await renderInStrictMode(
      <AppWithAReaderPerBook
        book={`first book`}
        createReaderForBook={createReaderForBook}
      />,
    )

    await expect(
      renderInStrictMode(
        <AppWithAReaderPerBook
          book={`second book`}
          createReaderForBook={createReaderForBook}
        />,
      ),
    ).resolves.toBeUndefined()
    const [strictModeReader, firstBookReader, secondBookReader] =
      createReaderForBook.mock.results.map(({ value }) => value)

    expect({
      books: createReaderForBook.mock.calls.map(([book]) => book),
      isStrictModeReaderMounted:
        strictModeReader?.context.value.rootElement !== undefined,
      isFirstBookReaderMounted:
        firstBookReader?.context.value.rootElement !== undefined,
      isFirstBookElementInReactReader: isElementInReactReader(
        firstBookReader?.context.value.rootElement,
      ),
      isSecondBookElementInReactReader: isElementInReactReader(
        secondBookReader?.context.value.rootElement,
      ),
    }).toEqual({
      books: [`first book`, `first book`, `second book`],
      isStrictModeReaderMounted: false,
      isFirstBookReaderMounted: true,
      isFirstBookElementInReactReader: false,
      isSecondBookElementInReactReader: true,
    })
  })

  it(`refuses a reader already mounted into another element`, async () => {
    const reader = createReaderDestroyedAfterTest()

    reader.mount(document.createElement(`div`))

    await expect(render(<ReactReader reader={reader} />)).rejects.toThrowError(
      /already mounted into another element/,
    )
  })
})
