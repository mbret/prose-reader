import React from "react"
import { ReactNode } from "react"

export const RootContainer = ({ children }: { children: ReactNode }) => {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        backgroundColor: "white",
        color: "black",
        display: "flex",
      }}
    >
      {children}
    </div>
  )
}
