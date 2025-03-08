import { Box, type BoxProps, Text } from "@chakra-ui/react"
import type React from "react"
import type { FC } from "react"

export const OrDivider: FC<
  { title?: string; style?: React.CSSProperties } & BoxProps
> = ({ title = "or", ...rest }) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      width="100%"
      opacity={0.5}
      {...rest}
    >
      <Box
        width="100%"
        height="1px"
        style={{
          borderBottom: "1px solid black",
          opacity: "30%",
        }}
      />
      <Box marginX={2}>
        <Text style={{ textTransform: "uppercase" }}>{title}</Text>
      </Box>
      <Box
        width="100%"
        style={{
          borderBottom: "1px solid black",
          opacity: "30%",
        }}
      />
    </Box>
  )
}
