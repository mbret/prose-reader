import React, { ComponentProps } from "react"
import { Box, Text } from "@chakra-ui/react"
import { FC } from "react"

type Props = ComponentProps<typeof Box> & {
  leftElement?: React.ReactElement
  middleElement?: React.ReactElement | string
  rightElement?: React.ReactElement
}

export const AppBar: FC<Props> = ({ children, leftElement, middleElement, rightElement, ...rest }) => (
  <Box
    minHeight={[70]}
    display="flex"
    width="100%"
    bg="gray.800"
    alignItems="center"
    justifyContent="space-between"
    paddingX={4}
    paddingY={4}
    {...rest}
  >
    <Box display="flex" alignItems="center" justifyContent="space-between" flex={1} overflow="auto">
      <Box flex={1}>{leftElement}</Box>
      <Box paddingX={2} overflow="auto" flexGrow={1} display="flex" justifyContent="center">
        {typeof middleElement === `string` ? (
          <Text as="h1" noOfLines={1}>
            {middleElement}
          </Text>
        ) : (
          middleElement
        )}
      </Box>
      <Box flex={1} display="flex" justifyContent="flex-end">
        {rightElement}
      </Box>
    </Box>
  </Box>
)
