import { Presence } from "@chakra-ui/react"
import type { ComponentProps } from "react"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { QuickMenu } from "./navigation/QuickMenu/QuickMenu"

export const ReactReader = ({
  enableFloatingTime = true,
  enableFloatingProgress = true,
  open,
  ...rest
}: {
  enableFloatingTime?: boolean
  enableFloatingProgress?: boolean
} & ComponentProps<typeof QuickMenu>) => {
  return (
    <>
      {enableFloatingProgress && (
        <Presence
          present={!open}
          animationName={{ _open: "fade-in", _closed: "fade-out" }}
          animationDuration="moderate"
        >
          <FloatingProgress />
        </Presence>
      )}
      <QuickMenu open={open} {...rest} />
      <Presence
        present={enableFloatingTime || open}
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="slow"
        overflow="hidden"
      >
        <FloatingTime />
      </Presence>
    </>
  )
}
