import { Box, type BoxProps } from "@chakra-ui/react"

export const CodeBlock = ({ code, ...props }: { code: string } & BoxProps) => (
  <Box
    as="pre"
    px="4"
    py="3.5"
    rounded="10px"
    bg="bg.inverted"
    color="fg.inverted"
    fontFamily="mono"
    fontSize="13px"
    lineHeight="1.65"
    overflowX="auto"
    {...props}
  >
    <code>{code}</code>
  </Box>
)
