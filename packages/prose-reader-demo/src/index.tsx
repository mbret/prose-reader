if (process.env.NODE_ENV === `development`) {
  window.__PROSE_READER_DEBUG = true
}

import React from "react"
import { createRoot } from "react-dom/client"
import { RecoilRoot } from "recoil"
import { App } from "./App"
import { QueryClient, QueryClientProvider } from "react-query"

const container = document.getElementById("app")

const queryClient = new QueryClient()

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", {})
      .then((registration) => {
        console.log("SW registered: ", registration)
        if (!container) return
        const root = createRoot(container)
        root.render(
          <React.StrictMode>
            <RecoilRoot>
              <QueryClientProvider client={queryClient}>
                <App />
              </QueryClientProvider>
            </RecoilRoot>
          </React.StrictMode>
        )
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
} else {
  alert(`Unable to install service worker`)
}
