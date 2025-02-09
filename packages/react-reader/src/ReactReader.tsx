import { Presence } from "@chakra-ui/react"
import { type ComponentProps, useState } from "react"
import { FloatingProgress } from "./navigation/FloatingProgress"
import { FloatingTime } from "./navigation/FloatingTime"
import { QuickMenu } from "./navigation/QuickMenu/QuickMenu"
import { useQuickMenu } from "./navigation/QuickMenu/useQuickMenu"
import { HelpDialog } from "./navigation/help/HelpDialog"
import { TableOfContentsDialog } from "./navigation/toc/TableOfContentsDialog"

export const ReactReader = ({
  enableFloatingTime = true,
  enableFloatingProgress = true,
  ...rest
}: {
  enableFloatingTime?: boolean
  enableFloatingProgress?: boolean
} & Omit<
  ComponentProps<typeof QuickMenu>,
  "onTableOfContentsClick" | "open"
>) => {
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [quickMenuOpen, setQuickMenuOpen] = useQuickMenu()

  return (
    <>
      {enableFloatingProgress && (
        <Presence
          present={!quickMenuOpen}
          animationName={{ _open: "fade-in", _closed: "fade-out" }}
          animationDuration="moderate"
        >
          <FloatingProgress />
        </Presence>
      )}
      <QuickMenu
        {...rest}
        onTableOfContentsClick={() => setIsTableOfContentsOpen(true)}
        onHelpClick={() => setIsHelpOpen(true)}
      />
      <HelpDialog open={isHelpOpen} setOpen={setIsHelpOpen} />
      <TableOfContentsDialog
        open={isTableOfContentsOpen}
        setOpen={setIsTableOfContentsOpen}
        onNavigate={() => {
          setIsTableOfContentsOpen(false)
          setQuickMenuOpen(false)
        }}
      />
      <Presence
        present={enableFloatingTime || quickMenuOpen}
        animationName={{ _open: "fade-in", _closed: "fade-out" }}
        animationDuration="slow"
        overflow="hidden"
      >
        <FloatingTime />
      </Presence>
    </>
  )
}
