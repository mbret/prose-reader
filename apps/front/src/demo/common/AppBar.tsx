import { Stack, Text } from "@chakra-ui/react"
import type React from "react"
import { type ComponentProps, memo } from "react"

export const AppBar = memo(
  ({
    leftElement,
    middleElement,
    rightElement,
    ...rest
  }: ComponentProps<typeof Stack> & {
    leftElement?: React.ReactElement
    middleElement?: React.ReactElement | string
    rightElement?: React.ReactElement
  }) => (
    <Stack
      width="100%"
      bg="gray.800"
      paddingX={4}
      paddingY={4}
      overflow="hidden"
      direction="row"
      alignItems="center"
      {...rest}
    >
      {leftElement}
      {typeof middleElement === "string" ? (
        <Text as="h1" lineClamp={1}>
          {middleElement}
        </Text>
      ) : (
        middleElement
      )}
      {rightElement}
    </Stack>
  ),
)
