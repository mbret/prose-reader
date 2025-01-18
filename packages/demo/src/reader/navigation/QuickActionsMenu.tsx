import { FaEdit } from "react-icons/fa"
import { IconButton, Stack } from "@chakra-ui/react"
import { useReader } from "../useReader"
import { filter, first, map, merge, of, switchMap } from "rxjs"
import { useObserve } from "reactjrx"
import { isQuickMenuOpenSignal } from "../states"
import { selectedHighlightSignal } from "../annotations/states"

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
      style={{
        border: "1px solid red",
        borderColor: "teal",
        padding: 5,
        borderRadius: 10,
        position: "absolute",
        bottom: "5%",
        right: "5%",
      }}
    >
      <IconButton
        onClick={() => {
          isQuickMenuOpenSignal.setValue(false)
          selectedHighlightSignal.setValue({
            selection: reader?.selection.getSelection(),
          })
        }}
      >
        <FaEdit />
      </IconButton>
    </Stack>
  )
}
