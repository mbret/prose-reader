import { Manifest } from "@oboku/shared"

export type Hook =
  {
    name: `item.onLoad`,
    fn: (manipulableFrame: {
      frame: HTMLIFrameElement,
      removeStyle: (id: string) => void,
      item: Manifest[`spineItems`][number],
      addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void,
    }) => (() => void) | void
  }
  | {
    name: `item.onCreated`,
    fn: (payload: { container: HTMLElement, loadingElement: HTMLElement }) => void
  }
  | {
    name: `item.onBeforeContainerCreated`,
    fn: (payload: HTMLElement) => HTMLElement
  }
  | {
    name: `item.onLayout`,
    fn: (payload: {
      frame: HTMLIFrameElement | undefined,
      container: HTMLElement,
      loadingElement: HTMLElement,
      item: Manifest[`spineItems`][number],
      overlayElement: HTMLDivElement
    }) => void
  }
  | {
    name: `item.onGetResource`,
    fn: (fetchResource: (item: Manifest[`spineItems`][number]) => Promise<Response>) => (item: Manifest[`spineItems`][number]) => Promise<Response>
  }
  /**
   * Only available during reader creation
   */
  | {
    name: `spine.onBeforeContainerCreated`,
    fn: (payload: HTMLElement) => HTMLElement
  }
  | {
    name: `onViewportOffsetAdjust`,
    fn: () => void
  }

export interface RegisterHook {
  (name: `item.onLoad`, fn: Extract<Hook, { name: `item.onLoad` }>[`fn`]): void
  (name: `item.onBeforeContainerCreated`, fn: Extract<Hook, { name: `item.onBeforeContainerCreated` }>[`fn`]): void
  (name: `item.onCreated`, fn: Extract<Hook, { name: `item.onCreated` }>[`fn`]): void
  (name: `item.onGetResource`, fn: Extract<Hook, { name: `item.onGetResource` }>[`fn`]): void
  (name: `onViewportOffsetAdjust`, fn: Extract<Hook, { name: `onViewportOffsetAdjust` }>[`fn`]): void
}
