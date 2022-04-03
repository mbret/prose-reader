import { Manifest } from "@prose-reader/shared"
import { Observable } from "rxjs"

export type Hook =
  /**
   * Ideal when your logic only needs to apply something to the item when it's loaded.
   * You can manipulate your item later if you need to update it and trigger a layout.
   * This logic will not run everytime there is a layout.
   */
  {
    name: `item.onLoad`,
    fn: (manipulableFrame: {
      frame: HTMLIFrameElement,
      removeStyle: (id: string) => void,
      item: Manifest[`spineItems`][number],
      addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void,
    }) => (() => void) | Observable<any> | void
  }
  | {
    name: `item.onBeforeContainerCreated`,
    fn: (payload: HTMLElement) => HTMLElement
  }
  /**
   * Ideal when your logic needs to apply something to the item chich requires
   * current layout information or is heavily sensitive to context changes.
   * Your logic will run everytime there is a layout triggered.
   */
  | {
    name: `item.onLayoutBeforeMeasurment`,
    fn: (payload: {
      frame: {
        getManipulableFrame: () => undefined | {
          removeStyle: (id: string) => void,
          addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void,
        },
        getViewportDimensions: () => {
          width: number;
          height: number;
        } | undefined,
        isUsingVerticalWriting: () => boolean,
        getIsReady: () => boolean
      },
      container: HTMLElement,
      item: Manifest[`spineItems`][number],
      minimumWidth: number,
      isImageType: () => boolean | undefined,
    }) => void
  }
  // | {
  //   name: `item.onLayout`,
  //   fn: (payload: {
  //     frame: HTMLIFrameElement | undefined,
  //     container: HTMLElement,
  //     item: Manifest[`spineItems`][number],
  //     overlayElement: HTMLDivElement
  //   }) => void
  // }
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
    name: `viewportNavigator.onBeforeContainerCreated`,
    fn: (payload: HTMLElement) => HTMLElement
  }
  | {
    name: `onViewportOffsetAdjust`,
    fn: () => void
  }

export interface RegisterHook {
  (name: `item.onLoad`, fn: Extract<Hook, { name: `item.onLoad` }>[`fn`]): void
  (name: `item.onBeforeContainerCreated`, fn: Extract<Hook, { name: `item.onBeforeContainerCreated` }>[`fn`]): void
  (name: `item.onGetResource`, fn: Extract<Hook, { name: `item.onGetResource` }>[`fn`]): void
  (name: `item.onLayoutBeforeMeasurment`, fn: Extract<Hook, { name: `item.onLayoutBeforeMeasurment` }>[`fn`]): void
  (name: `onViewportOffsetAdjust`, fn: Extract<Hook, { name: `onViewportOffsetAdjust` }>[`fn`]): void
}
