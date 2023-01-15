import { atom, useRecoilState, useRecoilValue } from "recoil"
import { ReaderInstance } from "./types"

export const readerState = atom<ReaderInstance | undefined>({
  key: "readerState",
  default: undefined,
  dangerouslyAllowMutability: true
})

export const useReader = () => useRecoilState(readerState)
export const useReaderValue = () => useRecoilValue(readerState)
