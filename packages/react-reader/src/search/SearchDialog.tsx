import { memo } from "react"
import { AppDialog } from "../components/AppDialog"
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
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        contentProps={{ height: "100%" }}
        bodyProps={{ flex: 1, p: 0 }}
      >
        <SearchDialogContent onNavigate={onNavigate} />
      </AppDialog>
    )
  },
)
