import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { memo } from "react"
import { Navigate, Route, Routes } from "react-router"
import { BooksScreen } from "./books/BooksScreen"
import { Toaster } from "./components/ui/toaster"
import { ReaderScreen } from "./reader/ReaderScreen"
import { useRegisterServiceWorker } from "./serviceWorker/useRegisterServiceWorker"

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => console.error(error),
  }),
})

/**
 * Every path is relative to `DEMO_BASE_PATH`, the router's basename.
 */
export const DemoRoutes = memo(() => {
  useRegisterServiceWorker()

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/" element={<BooksScreen />} />
        <Route path="reader/:url" element={<ReaderScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </QueryClientProvider>
  )
})
