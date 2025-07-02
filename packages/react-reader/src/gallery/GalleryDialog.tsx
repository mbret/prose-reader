import { Box, Button, Text } from "@chakra-ui/react"
import type { SpineItem } from "@prose-reader/core"
import { memo } from "react"
import { useObserve } from "reactjrx"
import { useMeasure } from "../common/useMeasure"
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
import { useReader } from "../context/useReader"
import { useAttachSnapshot } from "./useAttachSnapshot"

const GalleryItem = memo(
  ({ item, onNavigated }: { item: SpineItem; onNavigated: () => void }) => {
    const [setElement, measures, element] = useMeasure()
    const reader = useReader()

    useAttachSnapshot(element, item, measures)

    const locatedResource = useObserve(
      () => reader?.locateResource(item, { mode: "shallow" }),
      [reader, item],
    )

    return (
      <Box
        width="100%"
        aspectRatio="2/3"
        border="1px solid"
        borderColor="border"
        borderRadius="md"
        data-grid-item
        cursor="pointer"
        position="relative"
        overflow="hidden"
        onClick={() => {
          onNavigated()
          reader?.navigation.goToSpineItem({ indexOrId: item })
        }}
      >
        <Box
          height="100%"
          width="100%"
          overflow="hidden"
          pointerEvents="none"
          ref={setElement}
        />
        <Text
          position="absolute"
          bottom={0}
          left="0"
          right="0"
          textAlign="center"
          bgColor="white"
          p={4}
          fontSize="xs"
        >
          Page {(locatedResource?.meta?.absolutePageIndex ?? 0) + 1}
        </Text>
      </Box>
    )
  },
)

export const GalleryDialog = memo(
  ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
    const reader = useReader()
    const items = useObserve(() => reader?.spineItemsManager.items$, [reader])

    return (
      <DialogRoot
        lazyMount
        placement="center"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        size={{ mdDown: "full", md: "lg" }}
        scrollBehavior="inside"
      >
        <DialogContent height="100%">
          <DialogHeader>
            <DialogTitle>Gallery</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Box
              gridTemplateColumns={[
                "repeat(2, minmax(0, 1fr))",
                "repeat(3, minmax(0, 1fr))",
              ]}
              display="grid"
              gap={[2, 4]}
              pt={2}
              data-grid
            >
              {items?.map((item) => (
                <GalleryItem
                  key={item.item.id}
                  item={item}
                  onNavigated={() => {
                    setOpen(false)
                  }}
                />
              ))}
            </Box>
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
