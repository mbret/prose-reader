import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { memo } from "react"
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router"
import { QueryClientProvider$ } from "reactjrx"
import { BooksScreen } from "./books/BooksScreen"
import { Provider } from "./components/ui/provider"
import { Toaster } from "./components/ui/toaster"
import { HomeScreen } from "./home/HomeScreen"
import { ReaderScreen } from "./reader/ReaderScreen"

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => console.error(error),
  }),
})

export const App = memo(() => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <QueryClientProvider$>
          <Router>
            <Routes>
              <Route path="/reader/:url" element={<ReaderScreen />} />
              <Route path="/books" element={<BooksScreen />} />
              <Route path="/" element={<HomeScreen />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </QueryClientProvider$>
        <Toaster />
      </Provider>
    </QueryClientProvider>
  )
})
