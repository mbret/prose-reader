import { Link, List, Stack, Text } from "@chakra-ui/react"
import type { RuntimeAnnotation } from "@prose-reader/enhancer-annotations"
import { LuNotebookPen } from "react-icons/lu"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader.ts"

export const AnnotationListItem = ({
  annotation,
  onNavigate,
}: {
  annotation: RuntimeAnnotation
  onNavigate: () => void
}) => {
  const reader = useReader()
  const { cfi } = annotation
  // The text and the page of the row, once located: a click navigates by cfi.
  const { data: location } = useObserve(
    () => reader?.locateResource({ cfi }),
    [reader, cfi],
  )
  const textContent =
    location?.meta.range?.toString() || location?.meta.node?.textContent
  const absolutePageIndex = location?.meta.absolutePageIndex
  const pageNumber =
    absolutePageIndex === undefined ? undefined : absolutePageIndex + 1

  return (
    <List.Item>
      <Link
        href="#"
        onClick={() => {
          onNavigate()

          reader?.navigation.goToCfi(cfi)
        }}
      >
        <List.Indicator
          asChild
          visibility={annotation.notes ? "visible" : "hidden"}
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
