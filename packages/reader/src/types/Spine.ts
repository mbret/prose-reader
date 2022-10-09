import { Observable } from "rxjs"
import { Manifest } from "@prose-reader/shared"
import { createViewportNavigator } from "../viewportNavigator/viewportNavigator"
import { SpineItem } from "../spineItem/createSpineItem"
import { createSelection } from "../selection"
import { createCfiLocator } from "../spine/cfiLocator"
import { createLocationResolver } from "../spine/locationResolver"
import { createLocationResolver as createSpineItemLocator } from "../spineItem/locationResolver"
import { ViewportNavigationEntry } from "../spine/navigationResolver"

type RequireLayout = boolean
type ManipulableSpineItemCallback = Parameters<SpineItem[`manipulateSpineItem`]>[0]
type ManipulableSpineItemCallbackPayload = Parameters<ManipulableSpineItemCallback>[0]
type CfiLocator = ReturnType<typeof createCfiLocator>
type SpineItemLocator = ReturnType<typeof createSpineItemLocator>
type Locator = ReturnType<typeof createLocationResolver>

type Event = { type: `onSelectionChange`; data: ReturnType<typeof createSelection> | null }

export type Spine = {
  element: HTMLElement
  locator: Locator
  spineItemLocator: SpineItemLocator
  cfiLocator: CfiLocator
  normalizeEventForViewport: <E extends MouseEvent | TouchEvent | PointerEvent>(event: E) => E
  manipulateSpineItems: (cb: (payload: ManipulableSpineItemCallbackPayload & { index: number }) => RequireLayout) => void
  manipulateSpineItem: (id: string, cb: Parameters<SpineItem[`manipulateSpineItem`]>[0]) => void
  destroy: () => void
  isSelecting: () => boolean | undefined
  getSelection: () => Selection | undefined
  adjustPagination: (position: ViewportNavigationEntry) => Observable<`free` | `busy`>
  $: {
    $: Observable<Event>
    layout$: Observable<boolean>
    itemsCreated$: Observable<{ item: Manifest[`spineItems`][number]; element: HTMLElement }[]>
    itemsBeforeDestroy$: Observable<void>
  }
}
