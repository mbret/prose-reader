import { Box, IconButton } from "@chakra-ui/react"
import type { FC, ReactNode } from "react"
import { IoMdClose } from "react-icons/io"
import {
  DialogBackdrop,
  DialogContent,
  DialogRoot,
} from "../components/ui/dialog"
import { AppBar } from "./AppBar"

export const FullScreenDialog: FC<{
  onClose: () => void
  isOpen: boolean
  title: string
  children: ReactNode
}> = ({ onClose, isOpen, children, title }) => {
  return (
    <DialogRoot
      lazyMount
      open={isOpen}
      size="full"
      onOpenChange={(e) => {
        if (!e.open) {
          onClose()
        }
      }}
    >
      <DialogBackdrop />
      <DialogContent height="100%">
        <Box
          style={{
            height: "100%",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AppBar
            leftElement={
              <IconButton aria-label="back" onClick={onClose}>
                <IoMdClose />
              </IconButton>
            }
            middleElement={title}
          />
          {children}
        </Box>
      </DialogContent>
    </DialogRoot>
  )
}
