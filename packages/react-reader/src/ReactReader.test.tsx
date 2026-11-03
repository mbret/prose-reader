/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createReader, type Manifest } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { Activity, act, type ReactNode, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { filter, map, NEVER } from "rxjs"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from "vitest"
import { MAX_ZOOM_SCALE } from "./constants"
import { useReaderViewContext } from "./context/ReaderViewContext"
import { useReader } from "./context/useReader"
import { useReaderContext } from "./context/useReaderContext"
import { ReactReader } from "./ReactReader"
import { ReactReaderProvider } from "./ReactReaderProvider"
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
      getResource: () => NEVER,
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

describe(`ReactReaderProvider and ReactReader`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const renderRoot = async (rootElement: ReactNode) => {
    await act(async () => {
      root.render(rootElement)
    })
  }

  const render = (element: ReactNode) =>
    renderRoot(<ChakraProvider value={defaultSystem}>{element}</ChakraProvider>)

  const renderAndGetThrownMessage = async (element: ReactNode) => {
    const throwingContainer = document.createElement(`div`)
    document.body.appendChild(throwingContainer)
    const throwingRoot = createRoot(throwingContainer)

    onTestFinished(async function removeThrowingRoot() {
      await act(async () => {
        throwingRoot.unmount()
      })
      throwingContainer.remove()
    })

    try {
      await act(async () => {
        throwingRoot.render(
          <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>,
        )
      })
    } catch (error) {
      return error instanceof Error ? error.message : error
    }

    return undefined
  }

  const isElementInReactReader = (element: HTMLElement | undefined) =>
    [...container.querySelectorAll(`[data-prose-react-reader]`)].some(
      (reactReaderElement) => reactReaderElement.contains(element ?? null),
    )

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

  it(`creates the reader on the settings it manages, and mounts it in the element of ReactReader`, async () => {
    const { createOnePageReader, onMounted, getCreatedReaders } =
      createReaderFactory()
    const appSettings = {
      fontScale: 1.5,
      spreadMode: `never`,
      theme: `night`,
    } satisfies ReactReaderSettings

    await render(
      <ReactReaderProvider
        createReader={createOnePageReader}
        settings={appSettings}
      >
        <ReactReader />
      </ReactReaderProvider>,
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

  it(`leaves a setting the app gives no value on the value the reader was created with, and reports no change`, async () => {
    const { createOnePageReader, onMounted } = createReaderFactory({
      theme: `sepia`,
    })
    const onSettingsChange = vi.fn()

    await render(
      <ReactReaderProvider
        createReader={createOnePageReader}
        settings={{ fontScale: 1.5 }}
        onSettingsChange={onSettingsChange}
      >
        <ReactReader />
      </ReactReaderProvider>,
    )

    expect({
      settingsWhenMounted: onMounted.mock.calls,
      settingsChangesReported: onSettingsChange.mock.calls,
    }).toEqual({
      settingsWhenMounted: [
        [{ fontScale: 1.5, spreadMode: `auto`, theme: `sepia` }],
      ],
      settingsChangesReported: [],
    })
  })
  it(`mounts the reader on the value of a setting's screen scope`, async () => {
    const { createOnePageReader, onMounted } = createReaderFactory()

    setWindowWidthForTest(1400)
    await render(
      <ReactReaderProvider
        createReader={createOnePageReader}
        settingsScopes={{ spreadMode: `screen` }}
        settingsByScope={{ desktop: { spreadMode: `always` } }}
      >
        <ReactReader />
      </ReactReaderProvider>,
    )

    expect(onMounted.mock.calls).toEqual([
      [expect.objectContaining({ spreadMode: `always` })],
    ])
  })

  it(`keeps the reader on the settings the app changes`, async () => {
    const { createOnePageReader, getCreatedReaders } = createReaderFactory()
    const renderWithFontScale = (fontScale: number) =>
      render(
        <ReactReaderProvider
          createReader={createOnePageReader}
          settings={{ fontScale }}
        >
          <ReactReader />
        </ReactReaderProvider>,
      )

    await renderWithFontScale(1.5)
    await renderWithFontScale(2)
    const [reader] = getCreatedReaders()

    expect({
      creations: createOnePageReader.mock.calls.length,
      fontScale: reader?.settings.values.fontScale,
    }).toEqual({ creations: 1, fontScale: 2 })
  })

  it(`puts back the default of a prop the app stops passing`, async () => {
    const { createOnePageReader, getCreatedReaders } = createReaderFactory()

    await render(
      <ReactReaderProvider createReader={createOnePageReader} zoomMaxScale={3}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    const [reader] = getCreatedReaders()
    const zoomMaxScaleWhenPassed = reader?.gestures.settings.values.zoomMaxScale
    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )

    expect({
      zoomMaxScaleWhenPassed,
      zoomMaxScaleOnceDropped: reader?.gestures.settings.values.zoomMaxScale,
    }).toEqual({
      zoomMaxScaleWhenPassed: 3,
      zoomMaxScaleOnceDropped: MAX_ZOOM_SCALE,
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
      <ReactReaderProvider
        createReader={firstBook.createOnePageReader}
        settings={{ fontScale: 1.5, spreadMode: `never`, theme: `night` }}
      >
        <ReactReader />
      </ReactReaderProvider>,
    )
    await render(
      <ReactReaderProvider
        createReader={secondBook.createOnePageReader}
        settings={secondBookSettings}
      >
        <ReactReader />
      </ReactReaderProvider>,
    )
    const [secondReader] = secondBook.getCreatedReaders()
    const [firstDestroyedAt] = firstBook.onDestroyed.mock.invocationCallOrder
    const [secondCreatedAt] =
      secondBook.createOnePageReader.mock.invocationCallOrder

    expect({
      secondBookSettingsWhenMounted: secondBook.onMounted.mock.calls,
      isFirstDestroyedBeforeSecondCreated:
        Number(firstDestroyedAt) < Number(secondCreatedAt),
      isSecondElementInReactReader: isElementInReactReader(
        secondReader?.context.value.rootElement,
      ),
    }).toEqual({
      secondBookSettingsWhenMounted: [[secondBookSettings]],
      isFirstDestroyedBeforeSecondCreated: true,
      isSecondElementInReactReader: true,
    })
  })

  it(`mounts the next reader on the values react-reader kept as its own`, async () => {
    const firstBook = createReaderFactory()
    const secondBook = createReaderFactory()

    await render(
      <ReactReaderProvider createReader={firstBook.createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    const [firstReader] = firstBook.getCreatedReaders()
    await act(async () => {
      firstReader?.settings.update({ theme: `night` })
    })
    await render(
      <ReactReaderProvider createReader={secondBook.createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )

    expect(secondBook.onMounted.mock.calls).toEqual([
      [expect.objectContaining({ theme: `night` })],
    ])
  })

  it(`keeps the reader when the window crosses a breakpoint`, async () => {
    const { createOnePageReader, onDestroyed } = createReaderFactory()

    setWindowWidthForTest(800)
    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    await act(async () => {
      setWindowWidth(1400)
    })

    expect({
      creations: createOnePageReader.mock.calls.length,
      destroyed: nameReaders(onDestroyed.mock.calls, {}),
    }).toEqual({ creations: 1, destroyed: [] })
  })

  it(`gives the reader to the components under the provider, then undefined once createReader goes back to undefined`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const onReaderRendered = vi.fn()

    function ReaderUser() {
      onReaderRendered(useReader())

      return null
    }

    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
        <ReaderUser />
      </ReactReaderProvider>,
    )
    const [reader] = getCreatedReaders()
    const readerRenderedWithCreateReader = nameReaders(
      onReaderRendered.mock.calls,
      { reader },
    ).at(-1)
    await render(
      <ReactReaderProvider createReader={undefined}>
        <ReactReader />
        <ReaderUser />
      </ReactReaderProvider>,
    )

    expect({
      readerRenderedWithCreateReader,
      destroyed: nameReaders(onDestroyed.mock.calls, { reader }),
      readerRenderedOnceDropped: nameReaders(onReaderRendered.mock.calls, {
        reader,
      }).at(-1),
    }).toEqual({
      readerRenderedWithCreateReader: `reader`,
      destroyed: [`reader`],
      readerRenderedOnceDropped: undefined,
    })
  })

  it(`creates the reader once createReader arrives under a mounted ReactReader`, async () => {
    const { createOnePageReader, getCreatedReaders } = createReaderFactory()

    await render(
      <ReactReaderProvider createReader={undefined}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    const [reader] = getCreatedReaders()

    expect({
      creations: createOnePageReader.mock.calls.length,
      isReaderElementInReactReader: isElementInReactReader(
        reader?.context.value.rootElement,
      ),
    }).toEqual({
      creations: 1,
      isReaderElementInReactReader: true,
    })
  })

  it(`creates no reader in the element of a ReactReader that unmounts as createReader arrives`, async () => {
    const { createOnePageReader } = createReaderFactory()

    await render(
      <ReactReaderProvider createReader={undefined}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    await render(<ReactReaderProvider createReader={createOnePageReader} />)
    const creationsWithoutReactReader = createOnePageReader.mock.calls.length
    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )

    expect({
      creationsWithoutReactReader,
      creations: createOnePageReader.mock.calls.length,
    }).toEqual({ creationsWithoutReactReader: 0, creations: 1 })
  })

  it(`keeps the reader while an Activity hides ReactReader, on the settings the app changes meanwhile`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderInActivity = (
      mode: `visible` | `hidden`,
      settings: ReactReaderSettings,
    ) =>
      render(
        <ReactReaderProvider
          createReader={createOnePageReader}
          settings={settings}
        >
          <Activity mode={mode}>
            <ReactReader />
          </Activity>
        </ReactReaderProvider>,
      )

    await renderInActivity(`visible`, { fontScale: 1.5 })
    await renderInActivity(`hidden`, { fontScale: 1.5 })
    await renderInActivity(`hidden`, { fontScale: 2 })
    const [reader] = getCreatedReaders()
    const fontScaleWhileHidden = reader?.settings.values.fontScale
    await renderInActivity(`visible`, { fontScale: 2 })

    expect({
      creations: createOnePageReader.mock.calls.length,
      destroyed: nameReaders(onDestroyed.mock.calls, { reader }),
      fontScaleWhileHidden,
      isReaderElementInReactReader: isElementInReactReader(
        reader?.context.value.rootElement,
      ),
    }).toEqual({
      creations: 1,
      destroyed: [],
      fontScaleWhileHidden: 2,
      isReaderElementInReactReader: true,
    })
  })

  it(`destroys the reader while an Activity hides the provider, and creates a new one in the same element when it shows again`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderInActivity = (mode: `visible` | `hidden`) =>
      render(
        <Activity mode={mode}>
          <ReactReaderProvider createReader={createOnePageReader}>
            <ReactReader />
          </ReactReaderProvider>
        </Activity>,
      )

    await renderInActivity(`visible`)
    await renderInActivity(`hidden`)
    const [hiddenReader] = getCreatedReaders()
    const destroyedWhileHidden = nameReaders(onDestroyed.mock.calls, {
      hiddenReader,
    })
    await renderInActivity(`visible`)
    const [, shownReader] = getCreatedReaders()

    expect({
      destroyedWhileHidden,
      creations: createOnePageReader.mock.calls.length,
      isShownReaderInTheSameElement:
        shownReader?.context.value.rootElement ===
        hiddenReader?.context.value.rootElement,
      isShownReaderElementInReactReader: isElementInReactReader(
        shownReader?.context.value.rootElement,
      ),
    }).toEqual({
      destroyedWhileHidden: [`hiddenReader`],
      creations: 2,
      isShownReaderInTheSameElement: true,
      isShownReaderElementInReactReader: true,
    })
  })

  it(`keeps one reader when strict mode runs the effects twice, also as an Activity shows ReactReader again`, async () => {
    const { createOnePageReader, onDestroyed } = createReaderFactory()
    const renderInActivity = (mode: `visible` | `hidden`) =>
      renderRoot(
        <StrictMode>
          <ChakraProvider value={defaultSystem}>
            <ReactReaderProvider createReader={createOnePageReader}>
              <Activity mode={mode}>
                <ReactReader />
              </Activity>
            </ReactReaderProvider>
          </ChakraProvider>
        </StrictMode>,
      )

    await renderInActivity(`visible`)
    await renderInActivity(`hidden`)
    await renderInActivity(`visible`)

    expect({
      creations: createOnePageReader.mock.calls.length,
      destroyed: nameReaders(onDestroyed.mock.calls, {}),
    }).toEqual({ creations: 1, destroyed: [] })
  })

  it(`destroys the reader once ReactReader unmounts, and creates one in the element of the next ReactReader`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderWithReactReader = (reactReader: ReactNode) =>
      render(
        <ReactReaderProvider createReader={createOnePageReader}>
          {reactReader}
        </ReactReaderProvider>,
      )

    await renderWithReactReader(<ReactReader key="first" />)
    await renderWithReactReader(null)
    const [firstReader] = getCreatedReaders()
    const destroyedOnceUnmounted = nameReaders(onDestroyed.mock.calls, {
      firstReader,
    })
    await renderWithReactReader(<ReactReader key="next" />)
    const [, nextReader] = getCreatedReaders()

    expect({
      destroyedOnceUnmounted,
      creations: createOnePageReader.mock.calls.length,
      isNextReaderElementInReactReader: isElementInReactReader(
        nextReader?.context.value.rootElement,
      ),
    }).toEqual({
      destroyedOnceUnmounted: [`firstReader`],
      creations: 2,
      isNextReaderElementInReactReader: true,
    })
  })

  it(`creates a reader in a ReactReader that replaces a hidden one in the same render`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderInActivity = (mode: `visible` | `hidden`, key: string) =>
      render(
        <ReactReaderProvider createReader={createOnePageReader}>
          <Activity mode={mode}>
            <ReactReader key={key} />
          </Activity>
        </ReactReaderProvider>,
      )

    await renderInActivity(`visible`, `first`)
    await renderInActivity(`hidden`, `first`)
    await renderInActivity(`visible`, `next`)
    const [firstReader, nextReader] = getCreatedReaders()

    expect({
      destroyed: nameReaders(onDestroyed.mock.calls, {
        firstReader,
        nextReader,
      }),
      isNextReaderElementInReactReader: isElementInReactReader(
        nextReader?.context.value.rootElement,
      ),
    }).toEqual({
      destroyed: [`firstReader`],
      isNextReaderElementInReactReader: true,
    })
  })

  it(`stops watching the element of a ReactReader that an Activity shows again`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderInActivity = (mode: `visible` | `hidden`) =>
      render(
        <ReactReaderProvider createReader={createOnePageReader}>
          <Activity mode={mode}>
            <ReactReader />
          </Activity>
        </ReactReaderProvider>,
      )

    await renderInActivity(`visible`)
    await renderInActivity(`hidden`)
    await renderInActivity(`visible`)
    await act(async () => {
      container.remove()
      await Promise.resolve()
      document.body.appendChild(container)
    })
    const [reader] = getCreatedReaders()

    expect(nameReaders(onDestroyed.mock.calls, { reader })).toEqual([])
  })

  it(`destroys the reader once React removes a ReactReader that an Activity hides`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()
    const renderWithReactReader = (reactReader: ReactNode) =>
      render(
        <ReactReaderProvider createReader={createOnePageReader}>
          {reactReader}
        </ReactReaderProvider>,
      )

    await renderWithReactReader(
      <Activity mode="visible">
        <ReactReader />
      </Activity>,
    )
    await renderWithReactReader(
      <Activity mode="hidden">
        <ReactReader />
      </Activity>,
    )
    const [reader] = getCreatedReaders()
    const destroyedWhileHidden = nameReaders(onDestroyed.mock.calls, {
      reader,
    })
    await renderWithReactReader(null)

    expect({
      destroyedWhileHidden,
      destroyedOnceRemoved: nameReaders(onDestroyed.mock.calls, { reader }),
    }).toEqual({ destroyedWhileHidden: [], destroyedOnceRemoved: [`reader`] })
  })

  it(`opens a ReactReader that mounts again with its menus closed, and keeps open menus open while an Activity hides it`, async () => {
    const { createOnePageReader } = createReaderFactory()
    const onMenusRendered =
      vi.fn<
        (menus: { quickMenuOpen: boolean; fontSizeMenuOpen: boolean }) => void
      >()

    function MenusUser() {
      const {
        quickMenuOpen,
        onQuickMenuOpenChange,
        fontSizeMenuOpen,
        onFontSizeMenuOpenChange,
      } = useReaderViewContext()

      onMenusRendered({ quickMenuOpen, fontSizeMenuOpen })

      return (
        <button
          type="button"
          data-open-menus
          onClick={function openQuickMenuAndFontSizeMenu() {
            onQuickMenuOpenChange(true)
            onFontSizeMenuOpenChange(true)
          }}
        />
      )
    }

    const renderReactReader = (reactReader: ReactNode) =>
      render(
        <ReactReaderProvider createReader={createOnePageReader}>
          {reactReader}
        </ReactReaderProvider>,
      )
    const getLastMenus = () => onMenusRendered.mock.lastCall?.[0]

    await renderReactReader(
      <Activity mode="visible">
        <ReactReader key="first">
          <MenusUser />
        </ReactReader>
      </Activity>,
    )
    await act(async () => {
      container.querySelector<HTMLButtonElement>(`[data-open-menus]`)?.click()
    })
    const menusOnceOpened = getLastMenus()
    await renderReactReader(
      <Activity mode="hidden">
        <ReactReader key="first">
          <MenusUser />
        </ReactReader>
      </Activity>,
    )
    await renderReactReader(
      <Activity mode="visible">
        <ReactReader key="first">
          <MenusUser />
        </ReactReader>
      </Activity>,
    )
    const menusOnceShownAgain = getLastMenus()
    onMenusRendered.mockClear()
    await renderReactReader(
      <ReactReader key="next">
        <MenusUser />
      </ReactReader>,
    )
    const [menusOnFirstRenderOfTheNextReactReader] =
      onMenusRendered.mock.calls[0] ?? []

    expect({
      menusOnceOpened,
      menusOnceShownAgain,
      menusOnFirstRenderOfTheNextReactReader,
    }).toEqual({
      menusOnceOpened: { quickMenuOpen: true, fontSizeMenuOpen: true },
      menusOnceShownAgain: { quickMenuOpen: true, fontSizeMenuOpen: true },
      menusOnFirstRenderOfTheNextReactReader: {
        quickMenuOpen: false,
        fontSizeMenuOpen: false,
      },
    })
  })

  it(`opens react-reader's own quick menu unless the app controls it`, async () => {
    const { createOnePageReader } = createReaderFactory()
    const onQuickMenuRendered = vi.fn<(quickMenuOpen: boolean) => void>()
    const onAppQuickMenuOpenChange = vi.fn()

    function QuickMenuUser() {
      const { quickMenuOpen, onQuickMenuOpenChange } = useReaderViewContext()

      onQuickMenuRendered(quickMenuOpen)

      return (
        <button
          type="button"
          data-open-quick-menu
          onClick={function openQuickMenu() {
            onQuickMenuOpenChange(true)
          }}
        />
      )
    }

    const clickToOpenQuickMenu = () =>
      act(async () => {
        container
          .querySelector<HTMLButtonElement>(`[data-open-quick-menu]`)
          ?.click()
      })

    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader key="own">
          <QuickMenuUser />
        </ReactReader>
      </ReactReaderProvider>,
    )
    await clickToOpenQuickMenu()
    const ownQuickMenuOpen = onQuickMenuRendered.mock.lastCall?.[0]
    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader
          key="app"
          quickMenuOpen={false}
          onQuickMenuOpenChange={onAppQuickMenuOpenChange}
        >
          <QuickMenuUser />
        </ReactReader>
      </ReactReaderProvider>,
    )
    await clickToOpenQuickMenu()

    expect({
      ownQuickMenuOpen,
      appQuickMenuOpen: onQuickMenuRendered.mock.lastCall?.[0],
      appQuickMenuOpenChanges: onAppQuickMenuOpenChange.mock.calls,
    }).toEqual({
      ownQuickMenuOpen: true,
      appQuickMenuOpen: false,
      appQuickMenuOpenChanges: [[true]],
    })
  })

  it(`hides the floating progress while a quick menu the app does not control is open`, async () => {
    const { createOnePageReader } = createReaderFactory()

    function QuickMenuOpener() {
      const { onQuickMenuOpenChange } = useReaderViewContext()

      return (
        <button
          type="button"
          data-open-quick-menu
          onClick={function openQuickMenu() {
            onQuickMenuOpenChange(true)
          }}
        />
      )
    }

    const getFloatingProgressState = () =>
      [...container.querySelectorAll(`[data-scope="presence"]`)]
        .find((presence) => presence.textContent?.endsWith(` %`))
        ?.getAttribute(`data-state`)

    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader>
          <QuickMenuOpener />
        </ReactReader>
      </ReactReaderProvider>,
    )
    const stateWithQuickMenuClosed = getFloatingProgressState()
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(`[data-open-quick-menu]`)
        ?.click()
    })

    expect({
      stateWithQuickMenuClosed,
      stateWithQuickMenuOpen: getFloatingProgressState(),
    }).toEqual({
      stateWithQuickMenuClosed: `open`,
      stateWithQuickMenuOpen: `closed`,
    })
  })

  it(`clears the selected highlight when it destroys the reader`, async () => {
    const firstBook = createReaderFactory()
    const secondBook = createReaderFactory()
    const onContextRendered =
      vi.fn<(context: ReturnType<typeof useReaderContext>) => void>()

    function ContextUser() {
      onContextRendered(useReaderContext())

      return null
    }

    await render(
      <ReactReaderProvider createReader={firstBook.createOnePageReader}>
        <ReactReader />
        <ContextUser />
      </ReactReaderProvider>,
    )
    const [context] = onContextRendered.mock.lastCall ?? []
    await act(async () => {
      context?.update((old) => ({ ...old, selectedHighlight: {} }))
    })
    const selectedHighlightOnFirstReader = context?.value.selectedHighlight
    await render(
      <ReactReaderProvider createReader={secondBook.createOnePageReader}>
        <ReactReader />
        <ContextUser />
      </ReactReaderProvider>,
    )

    expect({
      selectedHighlightOnFirstReader,
      selectedHighlightOnSecondReader: context?.value.selectedHighlight,
    }).toEqual({
      selectedHighlightOnFirstReader: {},
      selectedHighlightOnSecondReader: undefined,
    })
  })

  it(`destroys the reader when the provider unmounts`, async () => {
    const { createOnePageReader, onDestroyed, getCreatedReaders } =
      createReaderFactory()

    await render(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
      </ReactReaderProvider>,
    )
    await render(null)
    const [reader] = getCreatedReaders()

    expect(nameReaders(onDestroyed.mock.calls, { reader })).toEqual([`reader`])
  })

  it(`throws when a second ReactReader renders under the same provider`, async () => {
    const { createOnePageReader } = createReaderFactory()

    const error = await renderAndGetThrownMessage(
      <ReactReaderProvider createReader={createOnePageReader}>
        <ReactReader />
        <ReactReader />
      </ReactReaderProvider>,
    )

    expect(error).toBe(`Render one ReactReader per ReactReaderProvider`)
  })

  it(`throws when useReader runs outside a provider`, async () => {
    function ReaderUser() {
      useReader()

      return null
    }

    const error = await renderAndGetThrownMessage(<ReaderUser />)

    expect(error).toBe(
      `ReactReader and useReader need a ReactReaderProvider above them`,
    )
  })
})
