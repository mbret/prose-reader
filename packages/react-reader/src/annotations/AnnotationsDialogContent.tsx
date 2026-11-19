import { Tabs } from "@chakra-ui/react"
import { memo, useState } from "react"
import { LuBookmark, LuNotebookPen } from "react-icons/lu"
import { AnnotationsList } from "./AnnotationsList.tsx"
import { useAnnotationsByKind } from "./useAnnotationsByKind.ts"

export const AnnotationsDialogContent = memo(
  ({
    onNavigate,
    defaultTab,
  }: {
    onNavigate: () => void
    defaultTab: "bookmarks" | "annotations" | undefined
  }) => {
    const [tab, setTab] = useState(defaultTab ?? "bookmarks")
    const { data: annotationsByKind } = useAnnotationsByKind()

    return (
      <Tabs.Root
        lazyMount
        unmountOnExit
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
          <AnnotationsList
            annotations={annotationsByKind?.bookmarks}
            onNavigate={onNavigate}
          />
        </Tabs.Content>
        <Tabs.Content value="annotations">
          <AnnotationsList
            annotations={annotationsByKind?.highlights}
            onNavigate={onNavigate}
          />
        </Tabs.Content>
      </Tabs.Root>
    )
  },
)
