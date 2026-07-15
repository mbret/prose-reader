import { memo } from "react"
import { AppDialog } from "../components/AppDialog"
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
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="Table of Contents"
        bodyProps={{ overflowY: "auto", flex: 1 }}
      >
        <TableOfContentsDialogContent onNavigate={onNavigate} />
      </AppDialog>
    )
  },
)
