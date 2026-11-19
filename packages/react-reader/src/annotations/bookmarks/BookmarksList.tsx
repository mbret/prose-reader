import { List } from "@chakra-ui/react"
import { AnnotationListItem } from "../AnnotationListItem.tsx"
import { useBookmarks } from "./useBookmarks.ts"

export const BookmarksList = ({ onNavigate }: { onNavigate: () => void }) => {
  const { data: annotations } = useBookmarks()

  return (
    <List.Root overflowY="auto" gap={3} pt={4} variant="plain">
      {annotations?.map((item) => (
        <AnnotationListItem
          key={item.id}
          id={item.id}
          onNavigate={onNavigate}
          allowLeftIcon={false}
        />
      ))}
    </List.Root>
  )
}
