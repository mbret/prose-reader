import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource-variable/literata/opsz.css"
import { StrictMode } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { Landing } from "./Landing"

const container = document.getElementById("root")

if (!container) {
  throw new Error(`Unable to find the landing page container`)
}

const landing = (
  <StrictMode>
    <Landing />
  </StrictMode>
)

/**
 * A build renders the page into the container, so React only attaches to it.
 * The dev server serves the container empty.
 */
if (container.firstElementChild) {
  hydrateRoot(container, landing)
} else {
  createRoot(container).render(landing)
}
