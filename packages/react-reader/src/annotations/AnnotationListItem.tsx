import { Link, List, Stack, Text } from "@chakra-ui/react"
import { LuNotebookPen } from "react-icons/lu"
import { useReader } from "../context/useReader"
import { useAnnotation } from "./useAnnotation"

export const AnnotationListItem = ({
  id,
  onNavigate,
}: { id: string; onNavigate: () => void }) => {
  const reader = useReader()
  const { data: annotation } = useAnnotation(id)

  return (
    <List.Item>
      <Link
        href="#"
        onClick={() => {
          onNavigate()

          reader?.navigation.goToCfi(annotation?.meta.cfi ?? "")
        }}
      >
        {annotation?.resource?.notes ? (
          <List.Indicator asChild>
            <LuNotebookPen />
          </List.Indicator>
        ) : (
          <List.Indicator asChild visibility="hidden">
            <LuNotebookPen />
          </List.Indicator>
        )}
        <Stack gap={0}>
          <Text lineClamp={2} fontSize="md">
            {annotation?.meta.range ? (
              annotation?.meta.range.toString()
            ) : (
              <i>
                <b>unknown (not loaded)</b>
              </i>
            )}
          </Text>
          <Text
            fontStyle="italic"
            fontWeight="bold"
            fontSize="sm"
          >{`Book page: ${
            annotation?.meta?.absolutePageIndex !== undefined
              ? annotation.meta.absolutePageIndex + 1
              : "unknown (not loaded)"
          }`}</Text>
        </Stack>
      </Link>
    </List.Item>
  )
}
