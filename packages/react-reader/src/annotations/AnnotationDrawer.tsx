import { Box, Button, Stack, Text, Textarea } from "@chakra-ui/react"
import { type ComponentProps, memo, useEffect, useState } from "react"
import { useSubscribe } from "reactjrx"
import { tap } from "rxjs"
import { truncateText } from "../common/utils"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
} from "../components/ui/drawer"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations"

const HIGHLIGHT_COLORS = [
  "rgba(216, 191, 216, 1)", // Light purple
  "rgba(255, 225, 125, 1)", // Soft yellow
  "rgba(144, 238, 144, 1)", // Light green
  "rgba(173, 216, 230, 1)", // Light blue
  "rgba(255, 182, 193, 1)", // Light pink
] as const

export const AnnotationDrawer = memo(() => {
  const reader = useReaderWithAnnotations()
  const {
    selectedHighlight,
    onAnnotationCreate,
    onAnnotationUpdate,
    onAnnotationDelete,
  } = useReaderContextValue([
    "selectedHighlight",
    "onAnnotationCreate",
    "onAnnotationUpdate",
    "onAnnotationDelete",
  ])
  const context = useReaderContext()
  const { highlight, selection } = selectedHighlight ?? {}
  const [selectedColor, setSelectedColor] = useState<string>(
    HIGHLIGHT_COLORS[0],
  )
  const [contents, setContents] = useState<string>("")
  const isOpen = !!(selection ?? highlight)

  const onClose = () => {
    context.update((state) => ({
      ...state,
      selectedHighlight: undefined,
    }))
  }

  const onOpenChange: ComponentProps<typeof DrawerRoot>["onOpenChange"] = (
    event,
  ) => {
    if (!event.open) {
      onClose()
    }
  }

  const highlightColor = highlight?.highlightColor
  const highlightContent = highlight?.notes

  useEffect(() => {
    void isOpen

    setContents("")
  }, [isOpen])

  useEffect(() => {
    setContents(highlightContent ?? "")
  }, [highlightContent])

  useEffect(() => {
    void isOpen

    if (highlightColor) {
      setSelectedColor(highlightColor)
    } else {
      setSelectedColor(HIGHLIGHT_COLORS[0])
    }
  }, [highlightColor, isOpen])

  useSubscribe(
    function openDrawerOnTap() {
      return reader?.annotations.highlightTap$.pipe(
        tap(({ highlight }) => {
          context.update((state) => ({
            ...state,
            selectedHighlight: {
              highlight,
            },
          }))
        }),
      )
    },
    [reader],
  )

  return (
    <DrawerRoot placement="bottom" onOpenChange={onOpenChange} open={isOpen}>
      <DrawerBackdrop />
      <DrawerContent>
        <DrawerHeader borderBottomWidth="1px">
          {highlight
            ? "Highlight"
            : `Selection: "${truncateText(selection?.selection?.toString() ?? "", 10)}"`}
        </DrawerHeader>
        <DrawerBody gap={4} display="flex" flexDirection="column" pb={4}>
          <Stack>
            <Stack gap={2} flexDirection="row">
              {HIGHLIGHT_COLORS.map((color) => (
                <Box
                  bgColor={color}
                  height={10}
                  width={10}
                  key={color}
                  borderRadius="50%"
                  cursor="pointer"
                  {...(selectedColor === color && {
                    border: "4px solid white",
                  })}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </Stack>
            <Text>Annotation:</Text>
            <Textarea
              value={contents}
              onChange={(event) => setContents(event.target.value)}
            />
          </Stack>
          {!!selection && (
            <Button
              onClick={() => {
                onClose()

                const annotation = reader?.annotations.createAnnotation({
                  ...selection,
                  highlightColor: selectedColor,
                  notes: contents,
                })

                if (annotation) {
                  onAnnotationCreate?.(annotation)
                }
              }}
            >
              Highlight
            </Button>
          )}
          {!!highlight && (
            <Stack direction="row">
              <Button
                flex={1}
                onClick={() => {
                  onClose()

                  onAnnotationUpdate?.({
                    id: highlight.id,
                    highlightColor: selectedColor,
                    notes: contents,
                  })
                }}
              >
                Update
              </Button>
              <Button
                flex={1}
                variant="surface"
                onClick={() => {
                  onClose()

                  onAnnotationDelete?.(highlight.id)
                }}
              >
                Remove
              </Button>
            </Stack>
          )}
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  )
})
