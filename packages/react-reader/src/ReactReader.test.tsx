/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { createReader, type Manifest } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { act, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { NEVER } from "rxjs"
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
import { ReactReader } from "./ReactReader"

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

describe(`ReactReader`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const render = async (element: ReactNode) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>,
      )
    })
  }

  /** A reader mounted in an element of the document, as an app mounts it. */
  const createMountedReader = () => {
    const readerElement = document.createElement(`div`)
    document.body.appendChild(readerElement)
    const reader = createAppReader({
      manifest: ONE_PAGE_MANIFEST,
      getResource: () => NEVER,
    })

    reader.mount(readerElement)
    onTestFinished(function destroyReader() {
      reader.destroy()
      readerElement.remove()
    })

    return reader
  }

  const clickToOpenQuickMenu = () =>
    act(async () => {
      container
        .querySelector<HTMLButtonElement>(`[data-open-quick-menu]`)
        ?.click()
    })

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

  it(`puts back the default of a prop the app stops passing`, async () => {
    const reader = createMountedReader()

    await render(
      <ReactReader reader={reader} zoomMaxScale={3}>
        {null}
      </ReactReader>,
    )
    const zoomMaxScaleWhenPassed = reader.gestures.settings.values.zoomMaxScale
    await render(<ReactReader reader={reader}>{null}</ReactReader>)

    expect({
      zoomMaxScaleWhenPassed,
      zoomMaxScaleOnceDropped: reader.gestures.settings.values.zoomMaxScale,
    }).toEqual({
      zoomMaxScaleWhenPassed: 3,
      zoomMaxScaleOnceDropped: MAX_ZOOM_SCALE,
    })
  })

  it(`opens its own quick menu unless the app controls it`, async () => {
    const reader = createMountedReader()
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

    await render(
      <ReactReader key="own" reader={reader}>
        <QuickMenuUser />
      </ReactReader>,
    )
    await clickToOpenQuickMenu()
    const ownQuickMenuOpen = onQuickMenuRendered.mock.lastCall?.[0]
    await render(
      <ReactReader
        key="app"
        reader={reader}
        quickMenuOpen={false}
        onQuickMenuOpenChange={onAppQuickMenuOpenChange}
      >
        <QuickMenuUser />
      </ReactReader>,
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
    const reader = createMountedReader()

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
      <ReactReader reader={reader}>
        <QuickMenuOpener />
      </ReactReader>,
    )
    const stateWithQuickMenuClosed = getFloatingProgressState()
    await clickToOpenQuickMenu()

    expect({
      stateWithQuickMenuClosed,
      stateWithQuickMenuOpen: getFloatingProgressState(),
    }).toEqual({
      stateWithQuickMenuClosed: `open`,
      stateWithQuickMenuOpen: `closed`,
    })
  })
})
