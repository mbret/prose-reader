import { Link, List, Stack, Text } from "@chakra-ui/react"
import { memo } from "react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { switchMap } from "rxjs"
import { LuNotebookPen } from "react-icons/lu"

export const AnnotationsMenu = memo(
  ({ onNavigate }: { onNavigate: () => void }) => {
    const { reader } = useReader()
    const consolidatedHighlights = useObserve(
      () =>
        reader?.annotations.highlights$.pipe(
          switchMap((highlights) => reader.pagination.locate(highlights)),
        ),
      [reader],
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

            reader?.navigation.goToCfi(item.cfi ?? "")
          }}
        >
          {(item.contents ?? [])[0] ? (
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
              {item.selectionAsText ? (
                (item.selectionAsText ?? "")
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
      <List.Root overflowY="auto" gap={3} pt={4} variant="plain" px={4}>
        {consolidatedHighlights?.map((item, index) =>
          mapItemToListEntry(item, index),
        )}
      </List.Root>
    )
  },
)
