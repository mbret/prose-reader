import { bind } from "@react-rxjs/core"
import { EMPTY, of } from "rxjs"
import { ReaderInstance } from "../types"
import { useReaderValue } from "../useReader"

const undefined$ = of(undefined)

const [useSettings, getStory$] = bind((reader?: ReaderInstance) => reader?.$.settings$ ?? undefined$)

export const useReaderSettings = () => {
  const reader = useReaderValue()

  return useSettings(reader)
}
