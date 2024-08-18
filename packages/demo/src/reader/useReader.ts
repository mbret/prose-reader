import { useMemo } from "react"
import { atom, useRecoilState } from "recoil"
import { of } from "rxjs"
import { isNotNullOrUndefined } from "../common/rxjs"
import { ReaderInstance } from "../types"

export const readerState = atom<ReaderInstance | undefined>({
  key: "readerState",
  default: undefined,
  dangerouslyAllowMutability: true
})

export const useReader = () => {
  const [reader, setReader] = useRecoilState(readerState)

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.reader = reader

  const reader$ = useMemo(() => of(reader).pipe(isNotNullOrUndefined()), [reader])

  return { reader, setReader, reader$ }
}
