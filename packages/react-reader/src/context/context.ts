import type { Reader } from "@prose-reader/core"
import { type Context, createContext } from "react"

export const ReaderContext: Context<Reader | undefined> = createContext<
  Reader | undefined
>(undefined)
