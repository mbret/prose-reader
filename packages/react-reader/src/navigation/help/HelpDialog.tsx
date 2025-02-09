import { Button, HStack, Heading, Kbd, Text } from "@chakra-ui/react"
import { memo } from "react"
import { LuArrowBigLeft, LuArrowBigRight } from "react-icons/lu"
import { name, version } from "../../../package.json"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../../components/ui/dialog"

export const HelpDialog = memo(
  ({
    open,
    setOpen,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
  }) => {
    return (
      <DialogRoot
        lazyMount
        placement="center"
        // open={open}
        open
        onOpenChange={(e) => setOpen(e.open)}
        size={{ mdDown: "full", md: "lg" }}
        scrollBehavior="inside"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help</DialogTitle>
          </DialogHeader>
          <DialogBody overflowY="auto" flex={1}>
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
            <Heading mb={2} mt={4} as="h3" size="lg">
              About
            </Heading>
            <Text>
              {name} version: {version}
            </Text>
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
