import { Button } from "@chakra-ui/react"
import type { ComponentProps, ReactNode } from "react"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "./ui/dialog"

/**
 * Shared shell for the reader's centered dialogs (search, table of contents,
 * annotations, help, gallery). They all use the same root configuration, header
 * layout, cancel footer and close trigger; only the title, body content and a
 * few presentational props differ, which are forwarded through `contentProps`
 * and `bodyProps`.
 */
export const AppDialog = ({
  open,
  onOpenChange,
  title,
  children,
  contentProps,
  bodyProps,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  children: ReactNode
  contentProps?: Omit<ComponentProps<typeof DialogContent>, "children">
  bodyProps?: Omit<ComponentProps<typeof DialogBody>, "children">
}) => {
  return (
    <DialogRoot
      lazyMount
      placement="center"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size={{ mdDown: "full", md: "lg" }}
      scrollBehavior="inside"
    >
      <DialogContent {...contentProps}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody {...bodyProps}>{children}</DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">Cancel</Button>
          </DialogActionTrigger>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
