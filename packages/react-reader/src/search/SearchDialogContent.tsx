import { Input, Stack, Text } from "@chakra-ui/react"
import type React from "react"
import { memo, useCallback } from "react"
import { useObserve } from "reactjrx"
import { useReader } from "../context/useReader"
import { SearchListItem } from "./SearchListItem"
import { useSearch } from "./useSearch"

export const SearchDialogContent = memo(
  ({
    onNavigate,
  }: {
    onNavigate: () => void
  }) => {
    const reader = useReader()
    const { value: searchValue, setValue, status, data } = useSearch()

    const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    }

    const onClick = useCallback(
      (cfi: string) => {
        onNavigate()
        reader?.navigation.goToCfi(cfi)
      },
      [reader, onNavigate],
    )

    const consolidatedResults = useObserve(
      () => reader?.locateResource(data?.slice(0, 100) ?? []),
      [data],
    )

    return (
      <Stack flex={1} height="100%" gap={2}>
        <Input
          placeholder="Type something..."
          value={searchValue}
          onChange={onValueChange}
          flexShrink={0}
          variant="subtle"
          name="search"
          focusRing="none"
          focusVisibleRing="none"
          outline="none"
          focusRingColor="transparent"
        />
        <Stack
          style={{ overflow: "hidden", overflowY: "auto" }}
          overflow="auto"
          px={4}
          flex={1}
        >
          {status === "start" && <Text>Searching ...</Text>}
          {data?.length === 0 && <Text>No results</Text>}
          {status === "end" && (data?.length ?? 0) > 0 && (
            <Stack>
              <Text fontSize="md">{data?.length} result(s)</Text>
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
                      text={searchValue}
                      cfi={result.meta.cfi}
                      onClick={onClick}
                      absolutePageIndex={result.meta?.absolutePageIndex}
                    />
                  )
                })}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Stack>
    )
  },
)
