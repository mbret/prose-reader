import React, { memo } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Home as ComicsHome } from "./comics/Home"
import { Home } from "./home/Home"
import { ChakraProvider } from "@chakra-ui/react"
import { theme } from "./theme/theme"
import { Home as ClassicHome } from "./classic/Home"
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
            <Route path="/books" element={<ClassicHome />} />
            <Route path="/comics" element={<ComicsHome />} />
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  )
})
