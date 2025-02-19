import { Presence, type PresenceProps } from "@chakra-ui/react"
import { memo } from "react"

export const QuickBar = memo(
  ({
    children,
    position,
    ...rest
  }: { position: "top" | "bottom" } & PresenceProps) => {
    return (
      <Presence
        display="flex"
        flexDirection="row"
        width="100%"
        position="absolute"
        {...(position === "bottom" ? { bottom: 0 } : { top: 0 })}
        animationName={
          position === "bottom"
            ? {
                _open: "slide-from-bottom, fade-in",
                _closed: "slide-to-bottom, fade-out",
              }
            : {
                _open: "slide-from-top, fade-in",
                _closed: "slide-to-top, fade-out",
              }
        }
        animationDuration="moderate"
        bgColor="bg.panel"
        alignItems="center"
        justifyContent="center"
        shadow="md"
        p={4}
        {...rest}
      >
        {children}
      </Presence>
    )
  },
)
