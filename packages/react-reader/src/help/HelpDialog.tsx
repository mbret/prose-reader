import { Heading, HStack, Kbd, Stack, Text } from "@chakra-ui/react"
import { memo } from "react"
import { LuArrowBigLeft, LuArrowBigRight } from "react-icons/lu"
import { name, version } from "../../package.json"
import { AppDialog } from "../components/AppDialog"

export const HelpDialog = memo(
  ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
    return (
      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="Help"
        bodyProps={{
          overflowY: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <Stack>
          <Heading mb={2} as="h3" size="lg">
            Shortcuts
          </Heading>
          <HStack mb={1}>
            <Kbd>
              <LuArrowBigRight />
            </Kbd>{" "}
            <Text>Navigate to right page</Text>
          </HStack>
          <HStack mb={1}>
            <Kbd>
              <LuArrowBigLeft />
            </Kbd>{" "}
            <Text>Navigate to left page</Text>
          </HStack>
        </Stack>
        <Stack>
          <Heading mb={2} as="h3" size="lg">
            Bookmarks
          </Heading>
          <HStack mb={1}>
            <Text>Tap on the top right corner of a page bookmark it</Text>
          </HStack>
        </Stack>
        <Stack>
          <Heading mb={2} as="h3" size="lg">
            About
          </Heading>
          <Text>
            {name} version: {version}
          </Text>
        </Stack>
      </AppDialog>
    )
  },
)
