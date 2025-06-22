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
import { AnnotationsDialogContent } from "./AnnotationsDialogContent"

export const AnnotationsDialog = memo(
  ({
    openWith,
    setOpen,
    onNavigate,
  }: {
    openWith: "bookmarks" | "annotations" | undefined
    setOpen: (open: boolean) => void
    onNavigate: () => void
  }) => {
    return (
      <DialogRoot
        lazyMount
        placement="center"
        open={!!openWith}
        onOpenChange={(e) => setOpen(e.open)}
        size={{ mdDown: "full", md: "lg" }}
        scrollBehavior="inside"
      >
        <DialogContent height="100%">
          <DialogHeader>
            <DialogTitle>Annotations</DialogTitle>
          </DialogHeader>
          <DialogBody flex={1}>
            <AnnotationsDialogContent
              onNavigate={onNavigate}
              defaultTab={openWith}
            />
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
