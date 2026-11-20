import { Link, List, Stack, Text } from "@chakra-ui/react"
import { LuNotebookPen } from "react-icons/lu"
import { useReader } from "../context/useReader.ts"
import { useAnnotation } from "./useAnnotation.ts"

export const AnnotationListItem = ({
  id,
  onNavigate,
}: {
  id: string
  onNavigate: () => void
}) => {
  const reader = useReader()
  const { data: annotation } = useAnnotation(id)
  const textContent =
    annotation?.meta.range?.toString() || annotation?.meta.node?.textContent
  const absolutePageIndex = annotation?.meta.absolutePageIndex
  const pageNumber =
    absolutePageIndex === undefined ? undefined : absolutePageIndex + 1

  return (
    <List.Item>
      <Link
        href="#"
        onClick={() => {
          onNavigate()

          reader?.navigation.goToCfi(annotation?.meta.cfi ?? "")
        }}
      >
        <List.Indicator
          asChild
          visibility={annotation?.resource?.notes ? "visible" : "hidden"}
        >
          <LuNotebookPen />
        </List.Indicator>
        <Stack gap={0}>
          {textContent ? (
            <Text lineClamp={2} fontSize="md">
              {textContent}
            </Text>
          ) : (
            <Text lineClamp={2} fontSize="md" fontStyle="italic">
              Page {pageNumber ?? "unknown"}
            </Text>
          )}
          <Text
            fontStyle="italic"
            fontWeight="bold"
            fontSize="sm"
          >{`Book page: ${pageNumber ?? "unknown"}`}</Text>
        </Stack>
      </Link>
    </List.Item>
  )
}
