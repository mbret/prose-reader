import { List } from "@chakra-ui/react"
import type { RuntimeAnnotation } from "@prose-reader/enhancer-annotations"
import { AnnotationListItem } from "./AnnotationListItem.tsx"

export const AnnotationsList = ({
  annotations,
  onNavigate,
}: {
  annotations: RuntimeAnnotation[] | undefined
  onNavigate: () => void
}) => (
  <List.Root overflowY="auto" gap={3} pt={4} variant="plain">
    {annotations?.map((annotation) => (
      <AnnotationListItem
        key={annotation.id}
        id={annotation.id}
        onNavigate={onNavigate}
      />
    ))}
  </List.Root>
)
