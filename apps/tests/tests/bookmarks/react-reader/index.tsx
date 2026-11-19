import "@prose-reader/react-reader/index.css"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { type CreateReaderOptions, createReader } from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { ReactReader, ReactReaderProvider } from "@prose-reader/react-reader"
import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { openFixtureBook } from "../../fixtureBook"

const createAppReader = gesturesEnhancer(annotationsEnhancer(createReader))

const ANNOTATIONS_STORAGE_KEY = "annotations"

/** The annotations kept before the page reloaded, as an app keeps them. */
const readStoredAnnotations = (): Annotation[] =>
  JSON.parse(sessionStorage.getItem(ANNOTATIONS_STORAGE_KEY) ?? "[]")

/**
 * react-reader over a reflowable book, with no chapter preloaded around the
 * reading position. The annotations live in the app's state, as an app keeps
 * them: react-reader reports a created or deleted bookmark, and the app passes
 * the new list back. They outlive a reload of the page, which opens the book
 * again on its first page.
 */
function App({
  book,
}: {
  book: Pick<CreateReaderOptions, "manifest" | "getResource">
}) {
  const [annotations, setAnnotations] = useState(readStoredAnnotations)

  useEffect(() => {
    sessionStorage.setItem(ANNOTATIONS_STORAGE_KEY, JSON.stringify(annotations))
  }, [annotations])

  const createBookReader = useCallback(() => {
    const reader = createAppReader({
      ...book,
      numberOfAdjacentSpineItemToPreLoad: 0,
      pageTurnAnimation: "none",
      layoutLayerTransition: false,
    })

    // @ts-expect-error export for the specs
    window.reader = reader

    return reader
  }, [book])

  return (
    <ChakraProvider value={defaultSystem}>
      <ReactReaderProvider
        createReader={createBookReader}
        annotations={annotations}
        onAnnotationCreate={(annotation) => {
          setAnnotations((previous) => [...previous, annotation])
        }}
        onAnnotationDelete={(id) => {
          setAnnotations((previous) =>
            previous.filter((annotation) => annotation.id !== id),
          )
        }}
      >
        <ReactReader />
      </ReactReaderProvider>
    </ChakraProvider>
  )
}

async function run() {
  const book = await openFixtureBook("accessible_epub_3.epub")

  // biome-ignore lint/style/noNonNullAssertion: the page holds the element
  createRoot(document.getElementById("app")!).render(<App book={book} />)
}

run()
