import { List } from "@chakra-ui/react"
import { AnnotationListItem } from "./AnnotationListItem"
import { useHighlights } from "./useHighlights"

export const AnnotationsList = ({ onNavigate }: { onNavigate: () => void }) => {
  const { data: annotations } = useHighlights()

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
