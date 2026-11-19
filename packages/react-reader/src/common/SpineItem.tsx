import type { SpineItem as CoreSpineItem } from "@prose-reader/core"
import { memo } from "react"
import { createPortal } from "react-dom"
import { AudioSpineItem } from "../audio/AudioSpineItem.tsx"

export const SpineItem = memo(({ item }: { item: CoreSpineItem }) => {
  const container = item.containerElement

  return <>{createPortal(<AudioSpineItem item={item} />, container)}</>
})
