import "@prose-reader/react-reader/index.css"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { type CreateReaderOptions, createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { ReactReader, ReactReaderProvider } from "@prose-reader/react-reader"
import { useCallback } from "react"
import { createRoot } from "react-dom/client"
import { openFixtureBook } from "../../fixtureBook"
import { getFileOfRequestedBook } from "../../utils/scenarioBooks"
import { SCRUBBER_BOOKS } from "./scrubberBooks"

const createAppReader = gesturesEnhancer(createReader)

function App({
  book,
}: {
  book: Pick<CreateReaderOptions, "manifest" | "getResource">
}) {
  const createBookReader = useCallback(() => {
    const reader = createAppReader({
      ...book,
      pageTurnAnimation: "none",
      layoutLayerTransition: false,
    })

    // @ts-expect-error export for the specs
    window.reader = reader

    return reader
  }, [book])

  return (
    <ChakraProvider value={defaultSystem}>
      <ReactReaderProvider createReader={createBookReader}>
        <ReactReader quickMenuOpen />
      </ReactReaderProvider>
    </ChakraProvider>
  )
}

async function run() {
  const book = await openFixtureBook(
    getFileOfRequestedBook(SCRUBBER_BOOKS, "pre-paginated-rtl"),
  )

  // biome-ignore lint/style/noNonNullAssertion: the page holds the element
  createRoot(document.getElementById("app")!).render(<App book={book} />)
}

run()
