import { Link, List, Stack, Text } from "@chakra-ui/react"
import { memo } from "react"
import { LuNotebookPen } from "react-icons/lu"
import { useObserve } from "reactjrx"
import { switchMap } from "rxjs"
import { hasAnnotationsEnhancer, useReader } from "../context/useReader"

export const AnnotationsDialogContent = memo(
  ({ onNavigate }: { onNavigate: () => void }) => {
    const reader = useReader()
    const readerWithAnnotations = hasAnnotationsEnhancer(reader)
      ? reader
      : undefined

    const consolidatedHighlights = useObserve(
      () =>
        readerWithAnnotations?.annotations.highlights$.pipe(
          switchMap((highlights) =>
            readerWithAnnotations.locateResources(highlights),
          ),
        ),
      [readerWithAnnotations],
    )

    const mapItemToListEntry = (
      item: NonNullable<typeof consolidatedHighlights>[number],
      index: number,
    ) => (
      <List.Item key={index}>
        <Link
          href="#"
          onClick={() => {
            onNavigate()

            reader?.navigation.goToCfi(item.meta.cfi ?? "")
          }}
        >
          {(item.resource?.contents ?? [])[0] ? (
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
              {item.resource?.selectionAsText ? (
                (item.resource.selectionAsText ?? "")
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
              item.meta?.absolutePageIndex !== undefined
                ? item.meta.absolutePageIndex + 1
                : "unknown (not loaded)"
            }`}</Text>
          </Stack>
        </Link>
      </List.Item>
    )

    return (
      <List.Root overflowY="auto" gap={3} pt={4} variant="plain">
        {consolidatedHighlights?.map((item, index) =>
          mapItemToListEntry(item, index),
        )}
      </List.Root>
    )
  },
)
