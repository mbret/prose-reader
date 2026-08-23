import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { App } from "./App"

const container = document.getElementById("root")

if (!container) {
  throw new Error(`Unable to find the app container`)
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.DEV) {
  const script = document.createElement("script")
  script.src = "//unpkg.com/react-scan/dist/auto.global.js"
  script.async = true

  document.head.appendChild(script)
}
