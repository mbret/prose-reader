import { IconButton, Stack } from "@chakra-ui/react"
import { FaEdit } from "react-icons/fa"
import { useObserve } from "reactjrx"
import { filter, first, map, merge, of, switchMap } from "rxjs"
import { selectedHighlightSignal } from "../annotations/states"
import { isQuickMenuOpenSignal } from "../states"
import { useReader } from "../useReader"

export const QuickActionsMenu = () => {
  const { reader } = useReader()
  const isOpen = useObserve(
    () =>
      reader?.selection.selectionOver$.pipe(
        switchMap(() =>
          merge(
            of(true),
            reader.selection.selection$.pipe(
              filter((selection) => !selection),
              map(() => false),
              first(),
            ),
          ),
        ),
      ),
    [reader],
  )

  return (
    <Stack
      opacity={isOpen ? 1 : 0}
      pointerEvents={isOpen ? "auto" : "none"}
      transition="opacity"
      rounded="xl"
      style={{
        border: "1px solid red",
        borderColor: "teal",
        padding: 5,
        position: "absolute",
        bottom: "5%",
        right: "5%",
      }}
    >
      <IconButton
        colorPalette="cyan"
        rounded="xl"
        onClick={() => {
          isQuickMenuOpenSignal.update(false)
          selectedHighlightSignal.update({
            selection: reader?.selection.getSelection(),
          })
        }}
      >
        <FaEdit />
      </IconButton>
    </Stack>
  )
}
