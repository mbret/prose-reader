/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SearchListItem } from "./SearchListItem.tsx"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

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
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  container.remove()
})

describe("a row of the search results", () => {
  it("reports the cfi of its result, and leaves the URL of the page as it was", async () => {
    const cfi = `epubcfi(/6/2!/4/2,/1:0,/1:5)`
    const onClick = vi.fn()

    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <SearchListItem
            contextText="Hello world"
            text="Hello"
            cfi={cfi}
            onClick={onClick}
          />
        </ChakraProvider>,
      )
    })

    const pageUrlBeforeTheClick = window.location.href
    const row = container.querySelector(`button`)

    if (!row) throw new Error("the search result has no row")

    await act(async () => {
      row.click()
    })

    expect({
      reportedCfis: onClick.mock.calls,
      pageUrl: window.location.href,
    }).toEqual({
      reportedCfis: [[cfi]],
      pageUrl: pageUrlBeforeTheClick,
    })
  })
})
