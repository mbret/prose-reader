import React, { useState } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"
import {
  RecoilRoot,
} from 'recoil'
import { ReaderContext } from './ReaderProvider'
import { Home as ClassicHome } from './classic/Home'
import { Home as ComicsHome } from './comics/Home'
import { Reader as ClassicReader } from './classic/Reader'
import { Reader as ComicsReader } from './comics/Reader'
import { Home } from './Home'
import { ChakraProvider } from "@chakra-ui/react"
import { theme } from './theme'

export const App = () => {
  const [reader, setReader] = useState<any | undefined>(undefined)

  return (
    <RecoilRoot>
      <ChakraProvider theme={theme}>
        <ReaderContext.Provider value={reader}>
          <Router>
            <Routes>
              <Route path="/classic/reader/:url" element={<ClassicReader onReader={setReader} />} />
              <Route path="/classic" element={<ClassicHome />} />
              <Route path="/comics/reader/:url" element={<ComicsReader onReader={setReader} />} />
              <Route path="/comics" element={<ComicsHome />} />
              <Route path="/" element={<Home />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ReaderContext.Provider>
      </ChakraProvider>
    </RecoilRoot>
  )
}