import { CheckCircleIcon } from "@chakra-ui/icons"
import { List, ListIcon, ListItem, Stack, Text } from "@chakra-ui/react"
import React from "react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { SlNote } from "react-icons/sl"
import { truncateText } from "../../common/utils"

export const AnnotationsMenu = ({ onNavigate }: { onNavigate: () => void }) => {
  const { reader } = useReader()
  const highlights = useObserve(() => reader?.annotations.highlights$, []) ?? []
  const consolidatedHighlights = useObserve(() => reader?.locations.locate(highlights), [reader, highlights])

  const mapItemToListEntry = (item: NonNullable<typeof consolidatedHighlights>["data"][number], index: number) => (
    <React.Fragment key={index}>
      <ListItem>
        <Stack
          flexDirection="row"
          as="a"
          href="#"
          alignItems="center"
          px={4}
          onClick={() => {
            onNavigate()

            reader?.navigation.goToCfi(item.cfi ?? "")
          }}
        >
          {(item.contents ?? [])[0] ? (
            <ListIcon as={SlNote} />
          ) : (
            <ListIcon as={CheckCircleIcon} style={{ visibility: "hidden" }} />
          )}
          <Stack gap={0}>
            <Text>
              {item.selectionAsText ? (
                truncateText(item.selectionAsText ?? "", 100)
              ) : (
                <i>
                  <b>unknown (not loaded)</b>
                </i>
              )}
            </Text>
            <Text
              fontStyle="italic"
              fontWeight="bold"
              fontSize="xs"
            >{`Book page: ${item.meta?.absolutePageIndex !== undefined ? item.meta.absolutePageIndex + 1 : "unknown (not loaded)"}`}</Text>
          </Stack>
        </Stack>
      </ListItem>
    </React.Fragment>
  )

  return (
    <List spacing={3} overflowY="auto" py={4} flex={1}>
      {consolidatedHighlights?.data?.map((item, index) => mapItemToListEntry(item, index))}
    </List>
  )
}
