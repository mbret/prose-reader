import { createContext, useContext } from "react"
import type { useCreateReader } from "./useCreateReader"

export const ReaderContext = createContext<
  ReturnType<typeof useCreateReader> | undefined
>(undefined)

export const useProseReaderContext = () => {
  const context = useContext(ReaderContext)

  if (!context) {
    throw new Error("useProseReader must be used within a ProseReaderProvider")
  }

  return context
}

export const ReaderProvider = ({
  children,
  reader,
}: {
  children: React.ReactNode
  reader: ReturnType<typeof useCreateReader>
}) => {
  return (
    <ReaderContext.Provider value={reader}>{children}</ReaderContext.Provider>
  )
}
