import { Heading, Input, Text, Box, Stack, Link } from "@chakra-ui/react"
import React, { useCallback, useState } from "react"
import { useReader } from "../useReader"
import { useObserve } from "reactjrx"
import { map, startWith } from "rxjs"

export const SearchMenu = ({ onNavigate }: { onNavigate: () => void }) => {
  const [text, setText] = useState("")
  const { reader } = useReader()

  const onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
  }

  const onClick = useCallback(
    (cfi: string) => {
      onNavigate()
      reader?.navigation.goToCfi(cfi)
    },
    [reader, onNavigate]
  )

  const search = useObserve(
    () =>
      reader?.search.search(text).pipe(
        map((data) => ({ type: `end` as const, data })),
        startWith({ type: `start` as const })
      ),
    [reader, text]
  )
  const searching = search?.type === "start"
  const results = search?.type === "end" ? search.data : []
  const consolidatedResults = useObserve(() => reader?.pagination.locate(results.slice(0, 100)), [results])

  return (
    <Stack flex={1}>
      <Input placeholder="Type something..." value={text} onChange={onValueChange} borderRadius={0} size="lg" />
      <Box padding={2} pt={2} flex={1} style={{ overflow: "hidden", overflowY: "auto" }}>
        {searching && <Text>Searching ...</Text>}
        {!searching && results.length === 0 && <p>There are no results</p>}
        {!searching && results.length >= 0 && (
          <Stack>
            <Heading as="h2" size="sm">
              {results.length} result(s)
            </Heading>
            <Stack gap={0}>
              {consolidatedResults?.map((result, j) => {
                return (
                  <Item
                    key={j}
                    contextText={result.meta?.range?.startContainer.parentElement?.textContent ?? ""}
                    pageIndex={result.meta?.itemPageIndex}
                    startOffset={result.meta?.range?.startOffset ?? 0}
                    text={text}
                    cfi={result.cfi}
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
}

const Item = ({
  contextText = "",
  startOffset = 0,
  text,
  cfi = "#",
  onClick,
  absolutePageIndex
}: {
  pageIndex: number | undefined
  absolutePageIndex?: number
  contextText?: string
  startOffset?: number
  text: string
  cfi?: string
  onClick: (cfi: string) => void
}) => {
  const charsAroundText = 15
  const before = contextText.substring(Math.max(startOffset - charsAroundText, 0), Math.max(startOffset, 0))
  const after = contextText.substring(
    Math.min(startOffset + text.length, contextText.length - 1),
    Math.min(startOffset + text.length + charsAroundText, contextText.length - 1)
  )

  return (
    <Link
      href={cfi}
      style={{ margin: 5, overflow: "hidden" }}
      onClick={(e) => {
        e.preventDefault()

        onClick(cfi)
      }}
    >
      <Link noOfLines={1} as="cite" style={{ display: "block" }}>
        "{before}
        <b>{text}</b>
        {after}"
      </Link>
      <Text size="xs" color="gray.500" style={{ textDecoration: "none" }}>
        {`Book page: ${absolutePageIndex !== undefined ? absolutePageIndex + 1 : "unknown (not loaded)"}`}
      </Text>
    </Link>
  )
}
