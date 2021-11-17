import React, { FC, useEffect, useState } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"
import {
  RecoilRoot, useSetRecoilState,
} from 'recoil'
import { ReaderContext } from './ReaderProvider'
import { Home as ClassicHome } from './classic/Home'
import { Home as ComicsHome } from './comics/Home'
import { Reader as ClassicReader } from './classic/Reader'
import { Reader as ComicsReader } from './comics/Reader'
import { Home } from './Home'
import { ChakraProvider, ColorModeProvider } from "@chakra-ui/react"
import { theme } from './theme'
import { ReaderInstance } from './types'
import { takeUntil } from 'rxjs'
import { readerSettingsState, readerStateState } from './state'
import { Report } from './report'

export const App = () => {
  const [reader, setReader] = useState<any | undefined>(undefined)

  return (
    <RecoilRoot>
      <ChakraProvider theme={theme}>
        <ColorModeProvider value="dark" options={{ initialColorMode: `dark`, useSystemColorMode: false }} >
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
        </ColorModeProvider>
      </ChakraProvider>
      <Effects reader={reader} />
    </RecoilRoot >
  )
}

const Effects: FC<{ reader: ReaderInstance | undefined }> = ({ reader }) => {
  const setReaderSettingsState = useSetRecoilState(readerSettingsState)
  const setReaderStateState = useSetRecoilState(readerStateState)

  useEffect(() => {
    reader?.$.settings$
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe(settings => {
        Report.log(`reader.$.settings$`, settings)
        setReaderSettingsState(settings)
      })

    reader?.$.state$
      .pipe(takeUntil(reader.$.destroy$))
      .subscribe(state => {
        Report.log(`reader.$.state$`, state)
        setReaderStateState(state)
      })
  }, [reader])

  return null
}