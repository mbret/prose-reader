import React, { useState } from 'react'
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom"
import { Reader } from './Reader'
import {
  RecoilRoot,
} from 'recoil'
import { ReaderContext } from './ReaderProvider'
import { ReaderInstance } from './types'
import { Home } from './Home'

export const App = () => {
  const [reader, setReader] = useState<ReaderInstance | undefined>(undefined)

  return (
    <RecoilRoot>
      <ReaderContext.Provider value={reader}>
        <Router>
          <Switch>
            <Route path="/reader/:url">
              <Reader onReader={setReader} />
            </Route>
            <Route path="/" exact >
              <Home />
            </Route>

            <Redirect from="*" to="/" />
          </Switch>
        </Router>
      </ReaderContext.Provider>
    </RecoilRoot>
  )
}