import React, { FC, memo, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useSetRecoilState } from "recoil"
import { Home as ComicsHome } from "./comics/Home"
import { Home } from "./Home"
import { ChakraProvider, ColorModeProvider } from "@chakra-ui/react"
import { theme } from "./theme/theme"
import { ReaderInstance } from "./types"
import { Home as ClassicHome } from "./classic/Home"
import { isZoomingState } from "./state"
import { ErrorBoundary } from "./common/ErrorBoundary"
import { useReader } from "./reader/useReader"
import { Subscribe } from "@react-rxjs/core"
import { Reader } from "./Reader"
import "@fontsource/dancing-script/400.css"

export const App = memo(() => {
  const { reader, setReader } = useReader()

  return (
    <Subscribe>
      <ChakraProvider theme={theme}>
        <ColorModeProvider value="dark" options={{ initialColorMode: `dark`, useSystemColorMode: false }}>
          <Router>
            <Routes>
              <Route
                path="/reader/:url"
                element={
                  <ErrorBoundary>
                    <Reader onReader={setReader} />
                  </ErrorBoundary>
                }
              />
              <Route path="/books" element={<ClassicHome />} />
              <Route path="/comics" element={<ComicsHome />} />
              <Route path="/" element={<Home />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ColorModeProvider>
      </ChakraProvider>
      <Effects reader={reader} />
    </Subscribe>
  )
})

const Effects: FC<{ reader: ReaderInstance | undefined }> = ({ reader }) => {
  const setIsZoomingState = useSetRecoilState(isZoomingState)

  useEffect(() => {
    const zoomSub = reader?.zoom.$.isZooming$.subscribe(setIsZoomingState)

    const paginationSub = reader?.pagination$.subscribe(({ beginCfi = `` }) => {
      localStorage.setItem(`cfi`, beginCfi)
    })

    return () => {
      paginationSub?.unsubscribe()
      zoomSub?.unsubscribe()
    }
  }, [reader, setIsZoomingState])

  return null
}
