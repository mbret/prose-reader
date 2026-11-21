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
  const { data: locatedAnnotation } = useObserve(
    () => reader?.locateResource({ cfi }),
    [reader, cfi],
  )
  const textContent =
    annotation.highlightedText ||
    locatedAnnotation?.meta.range?.toString() ||
    locatedAnnotation?.meta.node?.textContent
  const absolutePageIndex = locatedAnnotation?.meta.absolutePageIndex
  const pageNumber =
    absolutePageIndex === undefined ? undefined : absolutePageIndex + 1

  return (
    <List.Item>
      <Link asChild textAlign="start">
        <button
          type="button"
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
          <Stack as="span" gap={0}>
            {textContent ? (
              <Text as="span" lineClamp={2} fontSize="md">
                {textContent}
              </Text>
            ) : (
              <Text as="span" lineClamp={2} fontSize="md" fontStyle="italic">
                Page {pageNumber ?? "unknown"}
              </Text>
            )}
            <Text
              as="span"
              fontStyle="italic"
              fontWeight="bold"
              fontSize="sm"
            >{`Book page: ${pageNumber ?? "unknown"}`}</Text>
          </Stack>
        </button>
      </Link>
    </List.Item>
  )
}
