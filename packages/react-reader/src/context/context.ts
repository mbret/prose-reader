import type { Reader } from "@prose-reader/core"
import { type Context, createContext } from "react"
import { type Signal, signal } from "reactjrx"

type ContextType = {
  reader: Reader | undefined
  quickMenuSignal: Signal<boolean, boolean, undefined>
}

export const ReaderContext: Context<ContextType> = createContext<ContextType>({
  reader: undefined,
  quickMenuSignal: signal({ default: false }),
})
