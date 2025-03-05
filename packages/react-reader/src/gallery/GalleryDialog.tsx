import { Box, Button } from "@chakra-ui/react"
import type { SpineItem } from "@prose-reader/core"
import { memo } from "react"
import { useObserve, useSubscribe } from "reactjrx"
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

const GalleryItem = memo(({ item }: { item: SpineItem }) => {
  const reader = useReader()
  const [setElement, measures, element] = useMeasure()

  useAttachSnapshot(element, item, measures)

  useSubscribe(
    () => reader?.spine.spineItemsLoader.forceOpen([item]),
    [item, reader],
  )

  return (
    <Box
      ref={setElement}
      width="100%"
      aspectRatio="2/3"
      border="1px solid"
      borderColor="border"
      borderRadius="md"
      data-grid-item
    />
  )
})

export const GalleryDialog = memo(
  ({
    open,
    setOpen,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
  }) => {
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
                <GalleryItem key={item.item.id} item={item} />
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
