import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource-variable/literata/opsz.css"
import { ChakraProvider } from "@chakra-ui/react"
import { type ReactNode, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { landingSystem } from "./theme"

/**
 * Renders a page of the website into its document's #root, in the landing
 * page's theme and fonts. The landing page and the 404 page use it; the demo
 * has a look of its own.
 */
export const renderPage = (page: ReactNode) => {
  const container = document.getElementById("root")

  if (!container) {
    throw new Error(`Unable to find the page container`)
  }

  createRoot(container).render(
    <StrictMode>
      <ChakraProvider value={landingSystem}>{page}</ChakraProvider>
    </StrictMode>,
  )
}
