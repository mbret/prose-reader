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
import { ReactReader } from "../ReactReader"
import { useReader } from "./useReader"

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

describe(`useReader`, () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const render = async (element: ReactNode) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>,
      )
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

  it(`follows the reader passed to ReactReader one render behind`, async () => {
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
    const onReaderRendered = vi.fn()

    function ReaderUser() {
      onReaderRendered(useReader())

      return null
    }

    await render(
      <ReactReader reader={reader}>
        <ReaderUser />
      </ReactReader>,
    )
    await render(
      <ReactReader reader={undefined}>
        <ReaderUser />
      </ReactReader>,
    )

    expect(
      onReaderRendered.mock.calls.map(function nameReader([rendered]) {
        return rendered === reader ? `the reader` : rendered
      }),
    ).toEqual([undefined, `the reader`, `the reader`, undefined])
  })
})
