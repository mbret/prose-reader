/* eslint-disable react/display-name */
/* eslint-disable react/prop-types */
import React from "react"

export const ContainerElement = function ContainerElement({
  visible,
  onRef,
}: {
  visible: boolean
  onRef: (ref: HTMLDivElement) => void
}) {
  return (
    <div
      ref={(ref) => {
        ref && onRef(ref)
      }}
      style={{
        display: visible ? "flex" : "none",
      }}
      className="prose-reader-flex prose-reader-items-center prose-reader-justify-center prose-reader-w-full prose-reader-h-full"
    ></div>
  )
}
