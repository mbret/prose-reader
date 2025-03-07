import { Box, Heading, Input, Stack, Text } from "@chakra-ui/react"
import type React from "react"
import { memo, useCallback, useState } from "react"
import { useObserve } from "reactjrx"
import { map, startWith } from "rxjs"
import { hasSearchEnhancer, useReader } from "../context/useReader"
import { SearchListItem } from "./SearchListItem"

export const SearchDialogContent = memo(
  ({
    onNavigate,
  }: {
    onNavigate: () => void
  }) => {
    const [text, setText] = useState("")
    const reader = useReader()
    const readerWithSearch = hasSearchEnhancer(reader) ? reader : undefined

    const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value)
    }

    const onClick = useCallback(
      (cfi: string) => {
        onNavigate()
        reader?.navigation.goToCfi(cfi)
      },
      [reader, onNavigate],
    )

    const search = useObserve(
      () =>
        readerWithSearch?.search.search(text).pipe(
          map((data) => ({ type: `end` as const, data })),
          startWith({ type: `start` as const }),
        ),
      [reader, text],
    )
    const searching = search?.type === "start"
    const results = search?.type === "end" ? search.data : []
    const consolidatedResults = useObserve(
      () => reader?.locateResource(results.slice(0, 100)),
      [results],
    )

    return (
      <Stack flex={1} height="100%">
        <Box px={4}>
          <Input
            placeholder="Type something..."
            value={text}
            onChange={onValueChange}
            borderRadius={0}
          />
        </Box>
        <Box
          px={4}
          pb={4}
          mt={2}
          flex={1}
          style={{ overflow: "hidden", overflowY: "auto" }}
        >
          {searching && <Text>Searching ...</Text>}
          {!searching && results.length === 0 && <p>There are no results</p>}
          {!searching && results.length >= 0 && (
            <Stack>
              <Heading as="h2" size="md">
                {results.length} result(s)
              </Heading>
              <Stack gap={0}>
                {consolidatedResults?.map((result, j) => {
                  return (
                    <SearchListItem
                      key={j}
                      contextText={
                        result.meta?.range?.startContainer.parentElement
                          ?.textContent ?? ""
                      }
                      pageIndex={result.meta?.itemPageIndex}
                      startOffset={result.meta?.range?.startOffset ?? 0}
                      text={text}
                      cfi={result.meta.cfi}
                      onClick={onClick}
                      absolutePageIndex={result.meta?.absolutePageIndex}
                    />
                  )
                })}
              </Stack>
            </Stack>
          )}
        </Box>
      </Stack>
    )
  },
)
