import React, { ComponentProps } from "react"
import { Box, Stack, Text } from "@chakra-ui/react"

export const AppBar = ({
  leftElement,
  middleElement,
  rightElement,
  ...rest
}: ComponentProps<typeof Box> & {
  leftElement?: React.ReactElement
  middleElement?: React.ReactElement | string
  rightElement?: React.ReactElement
}) => (
  <Stack width="100%" bg="gray.800" paddingX={4} paddingY={4} overflow="hidden" direction="row" alignItems="center" {...rest}>
    {leftElement}
    {typeof middleElement === `string` ? (
      <Text as="h1" noOfLines={1}>
        {middleElement}
      </Text>
    ) : (
      middleElement
    )}
    {rightElement}
  </Stack>
)
