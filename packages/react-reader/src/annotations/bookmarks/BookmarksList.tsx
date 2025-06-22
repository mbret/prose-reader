import { List } from "@chakra-ui/react"
import { AnnotationListItem } from "../AnnotationListItem"
import { useBookmarks } from "./useBookmarks"

export const BookmarksList = ({ onNavigate }: { onNavigate: () => void }) => {
  const { data: annotations } = useBookmarks()

  return (
    <List.Root overflowY="auto" gap={3} pt={4} variant="plain">
      {annotations?.map((item) => (
        <AnnotationListItem
          key={item.resource.id}
          id={item.resource.id}
          onNavigate={onNavigate}
        />
      ))}
    </List.Root>
  )
}
