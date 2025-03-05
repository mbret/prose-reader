import { Box, Button } from "@chakra-ui/react"
import { type SpineItem, isShallowEqual } from "@prose-reader/core"
import { memo } from "react"
import { useObserve, useSubscribe } from "reactjrx"
import { NEVER, distinctUntilChanged, filter, map, switchMap, tap } from "rxjs"
import useMeasure from "../common/useMeasure"
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
import { hasGalleryEnhancer, useReader } from "../context/useReader"

const GalleryItem = ({ item }: { item: SpineItem }) => {
  const reader = useReader()
  const [setElement, measures, element] = useMeasure()
  const readerWithGalleryEnhancer = hasGalleryEnhancer(reader)
    ? reader
    : undefined

  useSubscribe(() => {
    if (!readerWithGalleryEnhancer || !element) return NEVER

    const itemReadyAndLayoutChanged$ = item.isReady$.pipe(
      filter((isReady) => isReady),
      map(() => item.layout.layoutInfo),
      distinctUntilChanged(isShallowEqual),
    )

    return itemReadyAndLayoutChanged$.pipe(
      switchMap(() =>
        readerWithGalleryEnhancer?.gallery.snapshot(item, measures),
      ),
      tap((snapshot) => {
        element.innerHTML = ""
        element.appendChild(snapshot)
      }),
    )
  }, [readerWithGalleryEnhancer, item, measures, element])

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
    >
      {item.item.id}
    </Box>
  )
}

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
          <DialogBody
            gridTemplateColumns={[
              "repeat(2, minmax(0, 1fr))",
              "repeat(2, minmax(0, 1fr))",
            ]}
            display="grid"
            gap={2}
            pt={2}
            data-grid
          >
            {items?.map((item) => (
              <GalleryItem key={item.item.id} item={item} />
            ))}
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
