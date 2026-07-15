import { memo } from "react"
import { AppDialog } from "../components/AppDialog"
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
      <AppDialog
        open={!!openWith}
        onOpenChange={setOpen}
        title="Annotations"
        contentProps={{ height: "100%" }}
        bodyProps={{ flex: 1 }}
      >
        <AnnotationsDialogContent
          onNavigate={onNavigate}
          defaultTab={openWith}
        />
      </AppDialog>
    )
  },
)
