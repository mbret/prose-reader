import { Button, Stack } from "@chakra-ui/react"
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
import { SpreadSection } from "./SpreadSection"

/**
 * How the book is laid out on the screen. One dialog for every layout
 * setting, each in its own section, rather than a quick menu button each.
 */
export const LayoutDialog = memo(
  ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
    return (
      <DialogRoot
        lazyMount
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        placement="center"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Layout</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Stack gap={6}>
              <SpreadSection />
            </Stack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Close</Button>
            </DialogActionTrigger>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    )
  },
)
