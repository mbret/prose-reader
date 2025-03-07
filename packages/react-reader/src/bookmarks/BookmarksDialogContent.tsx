import { Button, Link, List, Stack, Text } from "@chakra-ui/react"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { switchMap } from "rxjs"
import { hasBookmarksEnhancer, useReader } from "../context/useReader"

export const BookmarksDialogContent = memo(
  ({ onNavigate }: { onNavigate: () => void }) => {
    const reader = useReader()
    const readerWithBookmarks = hasBookmarksEnhancer(reader)
      ? reader
      : undefined

    const consolidatedBookmarks = useObserve(
      () =>
        readerWithBookmarks?.bookmarks.bookmarks$.pipe(
          switchMap((items) => readerWithBookmarks.locateResource(items)),
        ),
      [readerWithBookmarks],
    )

    const mapItemToListEntry = (
      item: NonNullable<typeof consolidatedBookmarks>[number],
      index: number,
    ) => (
      <List.Item key={index} justifyContent="space-between" alignItems="center">
        <Link
          href="#"
          onClick={() => {
            onNavigate()

            reader?.navigation.goToCfi(item.meta.cfi ?? "")
          }}
        >
          <Stack gap={0}>
            <Text fontSize="md">
              {`Book page: ${
                item.meta?.absolutePageIndex !== undefined
                  ? item.meta.absolutePageIndex + 1
                  : "unknown"
              }`}
            </Text>
            <Text
              fontStyle="italic"
              fontWeight="bold"
              fontSize="sm"
              truncate
              lineClamp={2}
            >
              {item.meta?.startNode?.textContent
                ? item.meta?.startNode?.textContent
                : "..."}
            </Text>
          </Stack>
        </Link>
        <Button
          colorPalette="red"
          variant="solid"
          size="xs"
          onClick={() => {
            readerWithBookmarks?.bookmarks.delete(item.resource.id)
          }}
        >
          Delete
        </Button>
      </List.Item>
    )

    return (
      <List.Root overflowY="auto" gap={3} variant="plain" overflow="auto">
        {consolidatedBookmarks?.map((item, index) =>
          mapItemToListEntry(item, index),
        )}
      </List.Root>
    )
  },
)
