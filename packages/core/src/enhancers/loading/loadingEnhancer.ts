import {
  type Observable,
  type ObservedValueOf,
  combineLatest,
  merge,
  of,
} from "rxjs"
import {
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators"
import type { Manifest } from "../.."
import { isShallowEqual } from "../../utils/objects"
import type { themeEnhancer } from "../theme"
import type { EnhancerOutput } from "../types/enhancer"
import { CONTAINER_HTML_PREFIX } from "./constants"
import {
  createLoadingElementContainer,
  defaultLoadingElementCreate,
} from "./createLoadingElement"

type Entries = { [key: string]: HTMLElement }
type Item = Manifest[`spineItems`][number]

type Options = {
  /**
   * Only called once for every items. It is being used to construct the loading element.
   * You can use it to customize your element.
   */
  loadingElementCreate?: (options: {
    container: HTMLElement
    item: Item
  }) => HTMLElement
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
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions & Options): InheritOutput & Output => {
    const { loadingElementCreate = defaultLoadingElementCreate } = options

    const reader = next(options)

    const createEntries$ = (
      items: ObservedValueOf<typeof reader.spineItemsManager.items$>,
    ) =>
      of(
        items.reduce((acc, { item, element }) => {
          // since we will use z-index for the loading element, we need to set the parent
          // to 0 to have it work as relative reference.
          element.style.zIndex = `0`

          const alreadyExistingElement = element.querySelector(
            `.${CONTAINER_HTML_PREFIX}`,
          )

          if (alreadyExistingElement instanceof HTMLElement) {
            acc[item.id] = alreadyExistingElement

            return acc
          }

          const loadingElementContainer = loadingElementCreate({
            container: createLoadingElementContainer(element, reader.context),
            item,
          })

          element.appendChild(loadingElementContainer)

          acc[item.id] = loadingElementContainer

          return acc
        }, {} as Entries),
      )

    const updateEntriesLayout$ = (entries: Entries) =>
      combineLatest([reader.spine.layout$, reader.theme.$.theme$]).pipe(
        map(([, theme]) => ({
          width: reader.context.state.visibleAreaRect.width,
          theme,
        })),
        distinctUntilChanged(isShallowEqual),
        tap(({ width, theme }) => {
          Object.values(entries).forEach((element) => {
            element.style.setProperty(`max-width`, `${width}px`)
            element.style.setProperty(
              `color`,
              theme === `sepia` ? `#939393` : `rgb(202, 202, 202)`,
            )
          })
        }),
      )

    const updateEntriesVisibility$ = (entries: Entries) =>
      reader.spineItemsObserver.itemIsReady$.pipe(
        tap(({ item, isReady }) => {
          entries[item.item.id]?.style.setProperty(
            `visibility`,
            isReady ? `hidden` : `visible`,
          )
          entries[item.item.id]?.style.setProperty(
            `z-index`,
            isReady ? `0` : `1`,
          )
        }),
      )

    const loadingItems$ = reader.spineItemsManager.items$.pipe(
      switchMap((items) => createEntries$(items)),
      shareReplay(1),
      takeUntil(reader.context.destroy$),
    )

    loadingItems$
      .pipe(
        switchMap((entries) =>
          merge(
            updateEntriesLayout$(entries),
            updateEntriesVisibility$(entries),
          ),
        ),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return {
      ...reader,
      loading: {
        $: {
          items$: loadingItems$,
        },
      },
    }
  }
