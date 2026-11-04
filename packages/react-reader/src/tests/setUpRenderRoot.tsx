import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach } from "vitest"

/**
 * Gives each test of the calling `describe` its own React root in the
 * document. `render` renders inside Chakra's provider and waits for React.
 */
export const setUpRenderRoot = () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(function createRenderRoot() {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    container = document.createElement(`div`)
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async function removeRenderRoot() {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  const render = async (element: ReactNode) => {
    await act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>{element}</ChakraProvider>,
      )
    })
  }

  const getContainer = () => container

  return { render, getContainer }
}
