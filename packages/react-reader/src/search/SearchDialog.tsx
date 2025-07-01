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
import { SearchDialogContent } from "./SearchDialogContent"

export const SearchDialog = memo(
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
        <DialogContent height="100%">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <DialogBody flex={1} p={0}>
            <SearchDialogContent onNavigate={onNavigate} />
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
