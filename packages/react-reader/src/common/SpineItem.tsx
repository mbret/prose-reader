import type { SpineItem as CoreSpineItem } from "@prose-reader/core"
import { memo } from "react"
import { createPortal } from "react-dom"

export const SpineItem = memo(({ item }: { item: CoreSpineItem }) => {
  const container = item.containerElement

  return <>{createPortal(null, container)}</>
})
