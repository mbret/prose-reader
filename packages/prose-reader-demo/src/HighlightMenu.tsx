import React, { useCallback } from "react"
import { useRecoilState } from "recoil"
import { Button } from "./common/Button"
import { useCSS } from "./common/css"
import { currentHighlight } from "./state"
import { useReaderValue } from "./useReader"

export const HighlightMenu = () => {
  const reader = useReaderValue()
  const [currentSelection, setCurrentSelection] = useRecoilState(currentHighlight)
  const isCurrentSelectionSaved = currentSelection?.id !== undefined
  const styles = useStyles()

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
        <div style={styles.container}>
          <div style={styles.subContainer}>
            <p style={styles.text}>"{currentSelection.text}"</p>
            {!isCurrentSelectionSaved && <Button onClick={addHighlight}>Highlight</Button>}
            {isCurrentSelectionSaved && <Button onClick={removeHighlight}>Remove highlight</Button>}
          </div>
        </div>
      )}
    </>
  )
}

const useStyles = () =>
  useCSS(
    () => ({
      container: {
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
      },
      subContainer: {
        paddingLeft: 10,
        width: `100%`,
        color: "white",
        height: `100%`,
        overflow: "hidden"
      },
      text: {
        // @see https://css-tricks.com/flexbox-truncated-text/
        // white-space: nowrap;
        overflow: "hidden",
        height: 30,
        textOverflow: "ellipsis"
      }
    }),
    []
  )
