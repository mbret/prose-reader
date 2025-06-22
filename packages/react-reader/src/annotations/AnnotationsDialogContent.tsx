import { Tabs } from "@chakra-ui/react"
import { memo, useState } from "react"
import { LuBookmark, LuNotebookPen } from "react-icons/lu"
import { AnnotationsList } from "./AnnotationsList"
import { BookmarksList } from "./bookmarks/BookmarksList"

export const AnnotationsDialogContent = memo(
  ({
    onNavigate,
    defaultTab,
  }: {
    onNavigate: () => void
    defaultTab: "bookmarks" | "annotations" | undefined
  }) => {
    const [tab, setTab] = useState(defaultTab ?? "bookmarks")

    return (
      <Tabs.Root
        value={tab}
        onValueChange={(e) => setTab(e.value as "bookmarks" | "annotations")}
      >
        <Tabs.List>
          <Tabs.Trigger value="bookmarks">
            <LuBookmark />
            Bookmarks
          </Tabs.Trigger>
          <Tabs.Trigger value="annotations">
            <LuNotebookPen />
            Annotations
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="bookmarks">
          <BookmarksList onNavigate={onNavigate} />
        </Tabs.Content>
        <Tabs.Content value="annotations">
          <AnnotationsList onNavigate={onNavigate} />
        </Tabs.Content>
      </Tabs.Root>
    )
  },
)
