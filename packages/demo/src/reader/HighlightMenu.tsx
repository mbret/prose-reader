import React, { useCallback } from "react"
import { useRecoilState } from "recoil"
import { Button } from "../common/Button"
import { currentHighlight } from "../state"
import { useReader } from "./useReader"

export const HighlightMenu = () => {
  const { reader } = useReader()
  const [currentSelection, setCurrentSelection] = useRecoilState(currentHighlight)
  const isCurrentSelectionSaved = currentSelection && reader?.highlights.has(currentSelection)

  const addHighlight = useCallback(() => {
    if (currentSelection) {
      reader?.highlights.add(currentSelection)
      setCurrentSelection(undefined)
    }
  }, [currentSelection, reader, setCurrentSelection])

  const removeHighlight = useCallback(() => {
    if (currentSelection?.id !== undefined) {
      reader?.highlights.remove(currentSelection.id)
      setCurrentSelection(undefined)
    }
  }, [currentSelection, reader, setCurrentSelection])

  return (
    <>
      {currentSelection && (
        <div
          style={{
            position: `absolute`,
            left: 0,
            bottom: 0,
            width: `100%`,
            height: 100,
            backgroundColor: "chocolate",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div style={{ paddingLeft: 10, width: `100%`, color: "white", height: `100%`, overflow: "hidden" }}>
            <p
              style={{
                // @see https://css-tricks.com/flexbox-truncated-text/
                // white-space: nowrap;
                overflow: "hidden",
                height: 30,
                textOverflow: "ellipsis"
              }}
            >
              "{currentSelection.text}"
            </p>
            {!isCurrentSelectionSaved && <Button onClick={addHighlight}>Highlight</Button>}
            {isCurrentSelectionSaved && <Button onClick={removeHighlight}>Remove highlight</Button>}
          </div>
        </div>
      )}
    </>
  )
}
