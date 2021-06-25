import React, { useState } from 'react'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom"
import {
  RecoilRoot,
} from 'recoil'
import { ReaderContext } from './ReaderProvider'
import { ReaderInstance } from './types'
import { Home as ClassicHome } from './classic/Home'
import { Home as ComicsHome } from './comics/Home'
import { Reader as ClassicReader } from './classic/Reader'
import { Reader as ComicsReader } from './comics/Reader'
import { Home } from './Home'
import { ChakraProvider } from "@chakra-ui/react"

export const App = () => {
  const [reader, setReader] = useState<ReaderInstance | undefined>(undefined)

  return (
    <RecoilRoot>
      <ChakraProvider>
        <ReaderContext.Provider value={reader}>
          <Router>
            <Switch>
              <Route path="/classic/reader/:url">
                <ClassicReader onReader={setReader} />
              </Route>
              <Route path="/classic">
                <ClassicHome />
              </Route>
              <Route path="/comics/reader/:url">
                <ComicsReader onReader={setReader} />
              </Route>
              <Route path="/comics">
                <ComicsHome />
              </Route>
              <Route path="/" exact >
                <Home />
              </Route>
              <Redirect from="*" to="/" />
            </Switch>
          </Router>
        </ReaderContext.Provider>
      </ChakraProvider>
    </RecoilRoot>
  )
}