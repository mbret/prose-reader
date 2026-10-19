import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "@fontsource-variable/literata/opsz.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Landing } from "./Landing"

const container = document.getElementById("root")

if (!container) {
  throw new Error(`Unable to find the landing page container`)
}

createRoot(container).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
)
