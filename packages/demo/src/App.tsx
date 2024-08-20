import React, { memo } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { HomeScreen } from "./home/HomeScreen"
import { ChakraProvider } from "@chakra-ui/react"
import { theme } from "./theme/theme"
import { BooksScreen } from "./books/BooksScreen"
import { Reader } from "./reader/Reader"
import { QueryClient, QueryClientProvider } from "reactjrx"

import "@fontsource/dancing-script/400.css"

const queryClient = new QueryClient()

export const App = memo(() => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <Router>
          <Routes>
            <Route path="/reader/:url" element={<Reader />} />
            <Route path="/books" element={<BooksScreen />} />
            <Route path="/" element={<HomeScreen />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  )
})
