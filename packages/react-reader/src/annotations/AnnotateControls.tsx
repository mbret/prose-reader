import { Button } from "@chakra-ui/react"
import { FaEdit } from "react-icons/fa"
import { LuNotebookPen } from "react-icons/lu"
import { useObserve } from "reactjrx"
import { EMPTY, map, startWith, switchMap } from "rxjs"
import { FloatingMenu } from "../common/FloatingMenu.tsx"
import {
  useReaderContext,
  useReaderContextValue,
} from "../context/useReaderContext.ts"
import { useReaderWithAnnotations } from "./useReaderWithAnnotations.ts"

export const AnnotateControls = () => {
  const reader = useReaderWithAnnotations()
  const context = useReaderContext()
  const { selectedHighlight } = useReaderContextValue(["selectedHighlight"])
  const { data: isOpen } = useObserve(
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
          const selectionToAnnotate = reader?.selection.getSelection()

          if (!selectionToAnnotate) return

          context.update((state) => ({
            ...state,
            selectedHighlight: {
              selection: {
                selection: selectionToAnnotate.selection,
                itemIndex: selectionToAnnotate.itemIndex,
              },
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
