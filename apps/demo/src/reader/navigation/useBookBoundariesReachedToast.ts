import { observeBookBoundaryReached } from "@prose-reader/core"
import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { toaster } from "../../components/ui/toaster"
import { useReader } from "../useReader"

const TOAST_BY_BOUNDARY = {
  start: {
    title: "Start of book",
    description: "You've reached the beginning. There's nothing before this.",
  },
  end: {
    title: "End of book",
    description: "You've reached the last page. There's nothing more to read.",
  },
} as const

export const useBookBoundariesReachedToast = () => {
  const { reader } = useReader()

  const subscribeToBoundary = useCallback(() => {
    if (!reader) return

    return observeBookBoundaryReached(reader).subscribe(({ boundary }) => {
      toaster.create({
        ...TOAST_BY_BOUNDARY[boundary],
        type: "info",
        duration: 2000,
      })
    })
  }, [reader])

  useSubscribe(subscribeToBoundary)
}
