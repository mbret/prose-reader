import React, { useCallback, useEffect } from 'react'
import { useRecoilState, useSetRecoilState } from 'recoil'
import { tap } from 'rxjs/operators'
import { Button } from './common/Button'
import { useCSS } from './common/css'
import { useReader } from './ReaderProvider'
import { currentHighlight, isMenuOpenState } from './state'

export const HighlightMenu = () => {
  const reader = useReader()
  const [currentSelection, setCurrentSelection] = useRecoilState(currentHighlight)
  const isCurrentSelectionSaved = currentSelection?.id !== undefined
  const setMenuOpenState = useSetRecoilState(isMenuOpenState)
  const styles = useStyles()

  useEffect(() => {
    const readerSubscription = reader?.$
      .pipe(
        tap(event => {
          if (event.type === `onSelectionChange`) {
            if (event.data?.toString() !== ``) {
              console.log('change', event.data?.getAnchorCfi(), event.data?.getFocusCfi())

              const anchorCfi = event.data?.getAnchorCfi()
              const focusCfi = event.data?.getFocusCfi()

              if (anchorCfi && focusCfi) {
                const highlight = { anchorCfi, focusCfi, text: event.data?.toString() }
                setCurrentSelection(highlight)
                setMenuOpenState(false)
              }
            } else {
              setCurrentSelection(undefined)
            }
          }
        })
      )
      .subscribe()

    return () => {
      readerSubscription?.unsubscribe()
    }
  }, [reader, setMenuOpenState])

  useEffect(() => {
    const subscription = reader?.highlights$.pipe(
      tap(event => {
        if (event.type === `onHighlightClick`) {
          setCurrentSelection(event.data)
          setMenuOpenState(false)
        }

        if (event.type === `onUpdate`) {
          const toStore = event.data.map(({ anchorCfi, focusCfi }) => ({ anchorCfi, focusCfi }))
          localStorage.setItem(`highlights`, JSON.stringify(toStore))
        }
      }),
    ).subscribe()

    return () => {
      subscription?.unsubscribe()
    }
  }, [setCurrentSelection, setMenuOpenState, reader])

  const addHighlight = useCallback(() => {
    if (currentSelection) {
      reader?.highlights.add(currentSelection)
    }
  }, [currentSelection, reader])

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

const useStyles = () => useCSS(() => ({
  container: {
    position: `absolute`,
    left: 0,
    bottom: 0,
    width: `100%`,
    height: 100,
    backgroundColor: 'chocolate',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subContainer: {
    paddingLeft: 10,
    width: `100%`,
    color: 'white',
    height: `100%`,
    overflow: 'hidden'
  },
  text: {
    // @see https://css-tricks.com/flexbox-truncated-text/
    // white-space: nowrap;
    overflow: 'hidden',
    height: 30,
    textOverflow: 'ellipsis',
  }
}), [])