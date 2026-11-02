import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import "./index.css"
import { DEMO_BASE_PATH } from "../constants"
import { Provider } from "./components/ui/provider"
import { DemoRoutes } from "./DemoRoutes"

const container = document.getElementById("root")

if (!container) {
  throw new Error(`Unable to find the app container`)
}

/**
 * demo.html is served for every path under `DEMO_BASE_PATH`, the router's
 * basename. The landing page is a page of its own, so a link to it is a plain
 * anchor, not a route.
 */
createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={DEMO_BASE_PATH}>
      <Provider>
        <DemoRoutes />
      </Provider>
    </BrowserRouter>
  </StrictMode>,
)

if (import.meta.env.DEV) {
  const script = document.createElement("script")
  script.src = "//unpkg.com/react-scan/dist/auto.global.js"
  script.async = true

  document.head.appendChild(script)
}
