import { Button, Heading, HStack, Kbd, Stack, Text } from "@chakra-ui/react"
import { memo } from "react"
import { LuArrowBigLeft, LuArrowBigRight } from "react-icons/lu"
import { name, version } from "../../package.json"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog"

export const HelpDialog = memo(
  ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
    return (
      <DialogRoot
        lazyMount
        placement="center"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        size={{ mdDown: "full", md: "lg" }}
        scrollBehavior="inside"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help</DialogTitle>
          </DialogHeader>
          <DialogBody
            overflowY="auto"
            flex={1}
            display="flex"
            flexDirection="column"
            gap={4}
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
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    )
  },
)
