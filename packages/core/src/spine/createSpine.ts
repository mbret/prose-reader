import { BehaviorSubject, Observable, Subject, Subscription } from "rxjs"
import { share, shareReplay, switchMap, takeUntil, tap } from "rxjs/operators"
import { Context } from "../context/Context"
import { Pagination } from "../pagination/Pagination"
import { createSpineItem } from "../spineItem/createSpineItem"
import { SpineItemsManager } from "./SpineItemsManager"
import { createSpineLocationResolver } from "./resolvers/SpineLocationResolver"
import { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import { createSelection } from "../selection"
import { HTML_PREFIX } from "../constants"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { SpineItemsLoader } from "./loader/SpineItemsLoader"
import { Manifest } from "@prose-reader/shared"
import { observeResize } from "../utils/rxjs"

const noopElement = document.createElement("div")

type SpineItem = ReturnType<typeof createSpineItem>
type RequireLayout = boolean
type ManipulableSpineItemCallback = Parameters<
  SpineItem[`manipulateSpineItem`]
>[0]
type ManipulableSpineItemCallbackPayload =
  Parameters<ManipulableSpineItemCallback>[0]

type Event = {
  type: `onSelectionChange`
  data: ReturnType<typeof createSelection> | null
}

export type Spine = ReturnType<typeof createSpine>

export const createSpine = ({
  element$,
  context,
  spineItemsManager,
  spineItemLocator,
  settings,
  hookManager,
}: {
  element$: Observable<HTMLElement>
  context: Context
  pagination: Pagination
  spineItemsManager: SpineItemsManager
  spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>
  settings: ReaderSettingsManager
  hookManager: HookManager
}) => {
  const spineItems$ = new Subject<SpineItem[]>()
  const itemsBeforeDestroySubject$ = new Subject<void>()
  const subject = new Subject<Event>()
  const spineContainerElementSubject = new BehaviorSubject<HTMLElement>(
    noopElement,
  )
  let selectionSubscription: Subscription | undefined

  const spineLocator = createSpineLocationResolver({
    context,
    spineItemsManager,
    spineItemLocator,
    settings,
  })

  const spineItemLoader = new SpineItemsLoader(
    context,
    spineItemsManager,
    spineLocator,
    settings,
  )

  /**
   * @todo handle reload
   */
  const reload = (manifest: Manifest) => {
    itemsBeforeDestroySubject$.next()

    spineItemsManager.destroyItems()

    manifest.spineItems.map((resource) => {
      const spineItem = createSpineItem({
        item: resource,
        containerElement: spineContainerElementSubject.getValue(),
        context,
        settings,
        hookManager,
      })
      spineItemsManager.add(spineItem)
    })

    spineItems$.next(spineItemsManager.getAll())
  }

  const manipulateSpineItems = (
    cb: (
      payload: ManipulableSpineItemCallbackPayload & { index: number },
    ) => RequireLayout,
  ) => {
    let shouldLayout = false
    spineItemsManager.getAll().forEach((item, index) => {
      shouldLayout =
        item.manipulateSpineItem((opts) => cb({ index, ...opts })) ||
        shouldLayout
    })

    if (shouldLayout) {
      spineItemsManager.layout()
    }
  }

  const manipulateSpineItem = (
    id: string,
    cb: Parameters<SpineItem[`manipulateSpineItem`]>[0],
  ) => {
    spineItemsManager.get(id)?.manipulateSpineItem(cb)
  }

  context.manifest$.pipe(tap(reload), takeUntil(context.destroy$)).subscribe()

  const elementSub = element$.pipe().subscribe((element) => {
    const containerElement = createContainerElement(element.ownerDocument)

    spineContainerElementSubject.next(containerElement)
  })

  const elementResize$ = spineContainerElementSubject.pipe(
    switchMap((element) => observeResize(element)),
    share(),
  )

  return {
    element$: spineContainerElementSubject,
    elementResize$,
    getElement: () => spineContainerElementSubject.getValue(),
    spineLocator,
    spineItemLocator,
    manipulateSpineItems,
    manipulateSpineItem,
    layout: () => {
      spineItemsManager.layout()
    },
    destroy: () => {
      spineItemLoader.destroy()
      elementSub.unsubscribe()
      spineItems$.complete()
      itemsBeforeDestroySubject$.next()
      itemsBeforeDestroySubject$.complete()
      subject.complete()
      spineItemsManager.destroy()
      selectionSubscription?.unsubscribe()
      spineContainerElementSubject.getValue().remove()
      spineContainerElementSubject.complete()
    },
    isSelecting: () =>
      spineItemsManager
        .getAll()
        .some((item) => item.selectionTracker.isSelecting()),
    getSelection: () =>
      spineItemsManager
        .getAll()
        .find((item) => item.selectionTracker.getSelection())
        ?.selectionTracker.getSelection(),
    $: {
      $: subject.asObservable(),
      layout$: spineItemsManager.layout$,
      spineItems$: spineItems$.asObservable(),
      itemsBeforeDestroy$: itemsBeforeDestroySubject$.asObservable(),
    },
  }
}

const createContainerElement = (doc: Document) => {
  const element: HTMLElement = doc.createElement(`div`)
  element.style.cssText = `
    height: 100%;
    position: relative;
  `
  element.className = `${HTML_PREFIX}-spine`

  return element
}
