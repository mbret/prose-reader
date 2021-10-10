import { Manifest } from "@oboku/shared"

const ITEM_ONLOAD = `item.onLoad`

export type Hook =
  {
    name: `item.onLoad`,
    fn: (manipulableFrame: {
      frame: HTMLIFrameElement,
      removeStyle: (id: string) => void,
      item: Manifest[`readingOrder`][number],
      addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void,
    }) => (() => void) | void
  }
  | {
    name: `item.onCreated`,
    fn: (payload: { container: HTMLElement, loadingElement: HTMLElement }) => void
  }
  | {
    name: `item.onLayout`,
    fn: (payload: {
      frame: HTMLIFrameElement | undefined,
      container: HTMLElement,
      loadingElement: HTMLElement,
      item: Manifest[`readingOrder`][number],
      overlayElement: HTMLDivElement
    }) => void
  }
  | {
    name: `item.onGetResource`,
    fn: (fetchResource: (item: Manifest[`readingOrder`][number]) => Promise<Response>) => (item: Manifest[`readingOrder`][number]) => Promise<Response>
  }
  | {
    name: `onViewportOffsetAdjust`,
    fn: () => void
  }

export interface RegisterHook {
  (name: `item.onLoad`, fn: Extract<Hook, { name: `item.onLoad` }>[`fn`]): void
  (name: `item.onCreated`, fn: Extract<Hook, { name: `item.onCreated` }>[`fn`]): void
  (name: `item.onGetResource`, fn: Extract<Hook, { name: `item.onGetResource` }>[`fn`]): void
  (name: `onViewportOffsetAdjust`, fn: Extract<Hook, { name: `onViewportOffsetAdjust` }>[`fn`]): void
}

const s: RegisterHook = () => { }
// const READING_ITEM_ON_LOAD_HOOK = 'item.onLoad'
// const READING_ITEM_ON_CREATED_HOOK = 'readingItem.onCreated'
// const READING_ITEM_ON_GET_RESOURCE = 'readingItem.onGetResource'
// const ON_VIEWPORT_OFFSET_ADJUST_HOOK = 'onViewportOffsetAdjust'

// s(`item.onLoad`, {})
