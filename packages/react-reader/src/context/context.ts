import type { Reader } from "@prose-reader/core"
import { createContext } from "react"

export const ReaderContext = createContext<Reader | undefined>(undefined)
