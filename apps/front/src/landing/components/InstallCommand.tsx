import {
  Box,
  Clipboard,
  type ClipboardRootProps,
  IconButton,
} from "@chakra-ui/react"
import { LuCheck, LuCopy } from "react-icons/lu"

const installCommand = "npm install @prose-reader/core"

export const InstallCommand = (props: ClipboardRootProps) => (
  <Clipboard.Root
    value={installCommand}
    display="inline-flex"
    alignItems="center"
    gap="3"
    maxW="full"
    py="1.5"
    pe="1.5"
    ps="4"
    rounded="xl"
    bg="bg.inverted"
    color="fg.inverted"
    fontFamily="mono"
    fontSize="sm"
    {...props}
  >
    <Box as="code" minW="0" truncate>
      <Box as="span" color="brand.400" aria-hidden>
        {"$ "}
      </Box>
      {installCommand}
    </Box>
    <Clipboard.Trigger asChild>
      <IconButton
        aria-label="Copy the install command"
        variant="outline"
        flexShrink="0"
        rounded="lg"
        borderColor="whiteAlpha.300"
        color="inherit"
        _hover={{ bg: "whiteAlpha.200" }}
      >
        <Clipboard.Indicator copied={<LuCheck />}>
          <LuCopy />
        </Clipboard.Indicator>
      </IconButton>
    </Clipboard.Trigger>
  </Clipboard.Root>
)
