import { useEffect, useState } from "react";
import { ReaderInstance } from "./types";
import { createHighlightsEnhancer } from "@oboku/reader-enhancer-highlights";

export const useHighlights = (reader: ReaderInstance | undefined) => {
  const [enhancer, setEnhancer] = useState<ReturnType<typeof createHighlightsEnhancer> | undefined>(undefined)

  // create bookmarks enhancer and initialize with local storage bookmarks
  useEffect(() => {
    const storedHighlights = JSON.parse(localStorage.getItem(`highlights`) || `[]`)

    const createdEnhancer = createHighlightsEnhancer({ highlights: storedHighlights })

    setEnhancer(() => createdEnhancer)
  }, [])

  return enhancer
}
