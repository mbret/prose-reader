import { EditIcon } from "@chakra-ui/icons"
import { Fade, IconButton, Stack } from "@chakra-ui/react"
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
    <Fade in={!!isOpen}>
      <Stack
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
          colorScheme="teal"
          aria-label="Search database"
          icon={<EditIcon />}
          onClick={() => {
            isQuickMenuOpenSignal.setValue(false)
            selectedHighlightSignal.setValue({
              selection: reader?.selection.getSelection(),
            })
          }}
        />
      </Stack>
    </Fade>
  )
}
