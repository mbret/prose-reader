import { Button } from "@chakra-ui/react"
import { memo } from "react"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog"
import { TableOfContentsDialogContent } from "./TableOfContentsDialogContent"

export const TableOfContentsDialog = memo(
  ({
    open,
    setOpen,
    onNavigate,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    onNavigate: () => void
  }) => {
    return (
      <DialogRoot
        lazyMount
        placement="center"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        size={{ mdDown: "full", md: "lg" }}
        scrollBehavior="inside"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Table of Contents</DialogTitle>
          </DialogHeader>
          <DialogBody overflowY="auto" flex={1}>
            <TableOfContentsDialogContent onNavigate={onNavigate} />
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    )
  },
)
