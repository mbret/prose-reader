import { Link, Text } from "@chakra-ui/react"
import { memo } from "react"

export const SearchListItem = memo(
  ({
    contextText = "",
    startOffset = 0,
    text,
    cfi = "#",
    onClick,
    absolutePageIndex,
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
    const before = contextText.substring(
      Math.max(startOffset - charsAroundText, 0),
      Math.max(startOffset, 0),
    )
    const after = contextText.substring(
      Math.min(startOffset + text.length, contextText.length - 1),
      Math.min(
        startOffset + text.length + charsAroundText,
        contextText.length - 1,
      ),
    )

    return (
      <Link
        href={cfi}
        style={{ margin: 5, overflow: "hidden" }}
        onClick={(e) => {
          e.preventDefault()

          onClick(cfi)
        }}
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap={0}
      >
        <Text lineClamp={1} as="cite" style={{ display: "block" }}>
          "{before}
          <b>{text}</b>
          {after}"
        </Text>
        <Text fontSize="sm" color="gray.500" style={{ textDecoration: "none" }}>
          {`Book page: ${absolutePageIndex !== undefined ? absolutePageIndex + 1 : "unknown (not loaded)"}`}
        </Text>
      </Link>
    )
  },
)
