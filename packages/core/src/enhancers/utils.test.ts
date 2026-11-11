import { describe, expect, it } from "vitest"
import {
  createFullTestReader,
  installReaderTestEnvironment,
} from "../tests/readerHarness"

installReaderTestEnvironment()

describe("injectScopedCSS", () => {
  it("puts the style in the reader's document, with every id replaced, until it is removed", () => {
    const foreignDocument = document.implementation.createHTMLDocument()
    const reader = createFullTestReader({ ownerDocument: foreignDocument })
    const styleId = `my-enhancer-${reader.id}`

    const removeStyle = reader.utils.injectScopedCSS(
      "my-enhancer",
      `[a="\${id}"] [b="\${id}"] {}`,
    )

    expect(foreignDocument.getElementById(styleId)?.textContent).toBe(
      `[a="${reader.id}"] [b="${reader.id}"] {}`,
    )
    expect(document.getElementById(styleId)).toBeNull()

    removeStyle()

    expect(foreignDocument.getElementById(styleId)).toBeNull()
  })
})
