import { memo } from "react"
import { createPortal } from "react-dom"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"
import { SpineItem } from "./SpineItem"

export const Spine = memo(({ children }: { children: React.ReactNode }) => {
  const reader = useReader()
  const { data: spineElement } = useObserve(
    () => reader?.spine.element$,
    [reader],
  )
  const { data: spineItems } = useObserve(
    () => reader?.spine.spineItemsManager.items$,
    [reader],
  )

  if (!spineElement) return null

  return (
    <>
      {createPortal(
        <>
          {children}
          {spineItems?.map((item) => (
            <SpineItem key={item.index} item={item} />
          ))}
        </>,
        spineElement,
      )}
    </>
  )
})
