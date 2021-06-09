import React, { useState } from 'react'
import { Reader } from './Reader'
import {
  RecoilRoot,
} from 'recoil'
import { ReaderContext } from './ReaderProvider'
import { ReaderInstance } from './types'

export const App = () => {
  const [reader, setReader] = useState<ReaderInstance | undefined>(undefined)

  return (
    <RecoilRoot>
      <ReaderContext.Provider value={reader}>
        <Reader onReader={setReader}/>
      </ReaderContext.Provider>
    </RecoilRoot>
  )
}