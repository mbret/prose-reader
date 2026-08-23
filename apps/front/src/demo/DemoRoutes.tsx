import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { memo } from "react"
import { Navigate, Route, Routes } from "react-router"
import { QueryClientProvider$ } from "reactjrx"
import { Toaster } from "../components/ui/toaster"
import { DEMO_BASE_PATH } from "../constants"
import { BooksScreen } from "./books/BooksScreen"
import { HomeScreen } from "./home/HomeScreen"
import { ReaderScreen } from "./reader/ReaderScreen"
import { useRegisterServiceWorker } from "./serviceWorker/useRegisterServiceWorker"

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => console.error(error),
  }),
})

/**
 * Every demo route is relative to `DEMO_BASE_PATH`, the app mounts them under
 * a splat route.
 */
export const DemoRoutes = memo(() => {
  useRegisterServiceWorker()

  return (
    <QueryClientProvider client={queryClient}>
      <QueryClientProvider$>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="books" element={<BooksScreen />} />
          <Route path="reader/:url" element={<ReaderScreen />} />
          <Route path="*" element={<Navigate to={DEMO_BASE_PATH} replace />} />
        </Routes>
        <Toaster />
      </QueryClientProvider$>
    </QueryClientProvider>
  )
})

export default DemoRoutes
