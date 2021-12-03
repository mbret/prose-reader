import { combineLatest, merge, ObservedValueOf, of } from "rxjs"
import { takeUntil, switchMap, tap, map, distinctUntilChanged } from "rxjs/operators"
import { isShallowEqual } from "../utils/objects"
import { Context } from "../context"
import { Manifest } from "../types"
import { themeEnhancer } from "./theme"
import { Enhancer } from "./types"

type Entries = { [key: string]: HTMLElement }

export const loadingEnhancer: Enhancer<{}, {}, {}, {}, typeof themeEnhancer> = (next) => (options) => {
  const reader = next(options)

  const createEntries$ = (items: ObservedValueOf<typeof reader.$.itemsCreated$>) =>
    of(
      items.reduce((acc, { item, element }) => {
        const loadingElement = createLoadingElement(element, item, reader.context)

        element.appendChild(loadingElement)

        return {
          ...acc,
          [item.id]: loadingElement
        }
      }, {} as Entries)
    )

  const updateEntriesLayout$ = (entries: Entries) =>
    combineLatest([reader.$.layout$, reader.theme.$.theme$])
      .pipe(
        map(([, theme]) => ({
          width: reader.context.getVisibleAreaRect().width,
          theme
        })),
        distinctUntilChanged(isShallowEqual),
        tap(({ width, theme }) => {
          Object.values(entries).forEach((element) => {
            element.style.setProperty(`max-width`, `${width}px`)
            element.style.setProperty(`color`, theme === `sepia` ? `#939393` : `rgb(202, 202, 202)`)
          })
        })
      )

  const updateEntriesVisibility$ = (entries: Entries) =>
    reader.$.itemIsReady$
      .pipe(
        tap(({ item, isReady }) => {
          entries[item.id]?.style.setProperty(`visibility`, isReady ? `hidden` : `visible`)
        })
      )

  const destroyEntries$ = (entries: Entries) =>
    reader.$.itemsBeforeDestroy$
      .pipe(
        map(() => {
          Object.values(entries).forEach((element) => element.remove())

          return {}
        })
      )

  reader.$.itemsCreated$
    .pipe(
      switchMap(items => createEntries$(items)),
      switchMap(entries => merge(
        of(entries),
        destroyEntries$(entries)
      )),
      switchMap(entries => merge(
        updateEntriesLayout$(entries),
        updateEntriesVisibility$(entries)
      )),
      takeUntil(reader.$.destroy$)
    ).subscribe()

  return reader
}

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
const createLoadingElement = (containerElement: HTMLElement, item: Manifest[`spineItems`][number], context: Context) => {
  const loadingElement = containerElement.ownerDocument.createElement(`div`)
  loadingElement.classList.add(`loading`)
  loadingElement.style.cssText = `
    height: 100%;
    width: 100%;
    max-width: ${context.getVisibleAreaRect().width}px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    position: absolute;
    left: 0;
    top: 0;
    color: rgb(202, 202, 202);
    -background-color: white;
  `

  const logoElement = containerElement.ownerDocument.createElement(`div`)
  logoElement.innerText = `prose`
  logoElement.style.cssText = `
    font-size: 4em;
  `
  const detailsElement = containerElement.ownerDocument.createElement(`div`)
  detailsElement.innerText = `loading ${item.id}`
  detailsElement.style.cssText = `
    font-size: 1.2em;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    max-width: 300px;
    width: 80%;
  `
  loadingElement.appendChild(logoElement)
  loadingElement.appendChild(detailsElement)

  return loadingElement
}
