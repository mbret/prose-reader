import { Button } from "@chakra-ui/react"
import { memo, useEffect, useState } from "react"
import { useObserve } from "reactjrx"
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

export const GalleryDialog = memo(
  ({
    open,
    setOpen,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
  }) => {
    const reader = useReader()
    const [element, setElement] = useState<HTMLElement | null>(null)
    const readerWithGalleryEnhancer = hasGalleryEnhancer(reader)
      ? reader
      : undefined

    const gridItemClassName = "prose-gallery-grid-item"

    const galleryRootElement = useObserve(
      () =>
        readerWithGalleryEnhancer?.gallery.create({
          gridItemClassName,
        }),
      [readerWithGalleryEnhancer],
    )

    useEffect(() => {
      if (element && galleryRootElement) {
        element.innerHTML = ""
        element.appendChild(galleryRootElement)
      }
    }, [galleryRootElement, element])

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
            ref={setElement}
            css={{
              "--prose-gallery-columns": ["2", "3"],
              [`& .${gridItemClassName}`]: {
                border: "1px solid red",
                borderColor: "border",
                borderRadius: "md",
              },
            }}
          />
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
