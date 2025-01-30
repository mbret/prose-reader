import type { Reader } from "@prose-reader/core"
import { memo } from "react"
import { ReaderContext } from "./context"

export const ReactReaderProvider = memo(
  ({ children, reader }: { children?: React.ReactNode; reader: Reader | undefined }) => {
    return (
      <ReaderContext.Provider value={reader}>{children}</ReaderContext.Provider>
    )
  },
)
