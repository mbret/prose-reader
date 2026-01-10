import { Button } from "@chakra-ui/react"
import { FaEdit } from "react-icons/fa"
import { LuNotebookPen } from "react-icons/lu"
import { useObserve } from "reactjrx"
import { EMPTY, map, startWith, switchMap } from "rxjs"
import { FloatingMenu } from "../common/FloatingMenu"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations"

export const AnnotateControls = () => {
  const reader = useReaderWithAnnotations()
  const context = useReaderContext()
  const { selectedHighlight } = useReaderContextValue(["selectedHighlight"])
  const isOpen = useObserve(
    () =>
      reader?.selection.selectionOver$.pipe(
        switchMap(() =>
          reader.selection.selectionEnd$.pipe(
            map(() => false),
            startWith(true),
          ),
        ),
      ) ?? EMPTY,
    { defaultValue: false },
    [reader],
  )

  return (
    <FloatingMenu present={isOpen && !selectedHighlight}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const selection = reader?.selection.getSelection()

          if (!selection) return

          context.update((state) => ({
            ...state,
            selectedHighlight: {
              selection,
            },
          }))
        }}
      >
        <FaEdit />
        Annotate
      </Button>
      <Button variant="outline" size="sm" disabled>
        <LuNotebookPen />
        Bookmark
      </Button>
    </FloatingMenu>
  )
}
