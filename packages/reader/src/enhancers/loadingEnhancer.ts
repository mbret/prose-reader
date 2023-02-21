import { combineLatest, merge, Observable, ObservedValueOf, of } from "rxjs"
import { takeUntil, switchMap, tap, map, distinctUntilChanged, shareReplay } from "rxjs/operators"
import { isShallowEqual } from "../utils/objects"
import { Context } from "../context"
import { Manifest } from "../types"
import { HTML_PREFIX as HTML_PREFIX_CORE } from "../constants"
import { EnhancerOutput } from "./types/enhancer"
import { themeEnhancer } from "./theme"

type Entries = { [key: string]: HTMLElement }
type Item = Manifest[`spineItems`][number]

const HTML_PREFIX = `${HTML_PREFIX_CORE}-enhancer-loading`
const CONTAINER_HTML_PREFIX = `${HTML_PREFIX}-container`

type Options = {
  /**
   * Only called once for every items. It is being used to construct the loading element.
   * You can use it to customize your element.
   */
  loadingElementCreate?: (options: { container: HTMLElement; item: Item }) => HTMLElement
}

type Output = {
  loading: {
    $: {
      items$: Observable<Entries>
    }
  }
}

export const loadingEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<typeof themeEnhancer>>(
    next: (options: InheritOptions) => InheritOutput
  ) =>
  (options: InheritOptions & Options): InheritOutput & Output => {
    const { loadingElementCreate = defaultLoadingElementCreate } = options

    const reader = next(options)

    const createEntries$ = (items: ObservedValueOf<typeof reader.spineItems$>) =>
      of(
        items.reduce((acc, { item, element }) => {
          const loadingElementContainer = loadingElementCreate({
            container: createLoadingElementContainer(element, reader.context),
            item,
          })

          element.appendChild(loadingElementContainer)

          return {
            ...acc,
            [item.id]: loadingElementContainer,
          }
        }, {} as Entries)
      )

    const updateEntriesLayout$ = (entries: Entries) =>
      combineLatest([reader.$.layout$, reader.theme.$.theme$]).pipe(
        map(([, theme]) => ({
          width: reader.context.getVisibleAreaRect().width,
          theme,
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
      reader.$.itemIsReady$.pipe(
        tap(({ item, isReady }) => {
          entries[item.id]?.style.setProperty(`visibility`, isReady ? `hidden` : `visible`)
        })
      )

    const destroyEntries$ = (entries: Entries) =>
      reader.$.itemsBeforeDestroy$.pipe(
        map(() => {
          Object.values(entries).forEach((element) => element.remove())

          return {}
        })
      )

    const items$ = reader.spineItems$.pipe(
      switchMap((items) => createEntries$(items)),
      shareReplay(1),
      takeUntil(reader.context.$.destroy$)
    )

    items$
      .pipe(
        switchMap((entries) => merge(of(entries), destroyEntries$(entries))),
        switchMap((entries) => merge(updateEntriesLayout$(entries), updateEntriesVisibility$(entries))),
        takeUntil(reader.$.destroy$)
      )
      .subscribe()

    return {
      ...reader,
      loading: {
        $: {
          items$,
        },
      },
    }
  }

/**
 * We use iframe for loading element mainly to be able to use share hooks / manipulation
 * with iframe. That way the loading element always match whatever style is applied to iframe.
 */
const createLoadingElementContainer = (containerElement: HTMLElement, context: Context) => {
  const loadingElement = containerElement.ownerDocument.createElement(`div`)
  loadingElement.classList.add(CONTAINER_HTML_PREFIX)
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

  return loadingElement
}

const defaultLoadingElementCreate = ({ container, item }: { container: HTMLElement; item: Manifest[`spineItems`][number] }) => {
  const logoElement = container.ownerDocument.createElement(`div`)
  logoElement.innerText = `prose`
  logoElement.style.cssText = `
    font-size: 4em;
  `
  const detailsElement = container.ownerDocument.createElement(`div`)
  detailsElement.innerText = `loading ${item.id}`
  detailsElement.style.cssText = `
    font-size: 1.2em;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    max-width: 300px;
    width: 80%;
  `
  container.appendChild(logoElement)
  container.appendChild(detailsElement)

  return container
}
