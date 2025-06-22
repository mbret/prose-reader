import { memo } from "react"
import { createPortal } from "react-dom"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"

export const Spine = memo(({ children }: { children: React.ReactNode }) => {
  const reader = useReader()
  const spineElement = useObserve(() => reader?.spine.element$, [reader])

  if (!spineElement) return null

  return <>{createPortal(children, spineElement)}</>
})
