import { bind } from "@react-rxjs/core"
import { of } from "rxjs"
import { ReaderInstance } from "../types"
import { useReader } from "../reader/useReader"

const undefined$ = of(undefined)

const [useSettings] = bind((reader?: ReaderInstance) => reader?.settings$ ?? undefined$)

export const useReaderSettings = () => {
  const {reader} = useReader()

  return useSettings(reader)
}
