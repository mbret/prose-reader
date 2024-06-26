import { Manifest } from "@prose-reader/shared"
import { Observable } from "rxjs"

export type UserDestroyFn = () => void | Observable<unknown>

export type Hook =
  | {
      name: `item.onLoad`
      runFn: (params: {
        destroy$: Observable<void>
        destroy: (fn: UserDestroyFn) => void
        itemId: string
        frame: HTMLIFrameElement
      }) => Observable<void>
    }
  | {
      name: "item.onAfterLayout"
      runFn: (params: {
        blankPagePosition: "before" | "after" | "none"
        item: Manifest["spineItems"][number]
        minimumWidth: number
      }) => void
    }
  /**
   * before the container of the item is attached to the dom
   */
  | {
      name: "item.onBeforeContainerCreated"
      runFn: (params: { element: HTMLElement }) => void
    }
  /**
   * Ideal when your logic needs to apply something to the item chich requires
   * current layout information or is heavily sensitive to context changes.
   * Your logic will run everytime there is a layout triggered.
   */
  | {
      name: "item.onLayoutBeforeMeasurement"
      runFn: (params: {
        frame: {
          getManipulableFrame: () =>
            | undefined
            | {
                removeStyle: (id: string) => void
                addStyle: (id: string, style: CSSStyleDeclaration[`cssText`]) => void
              }
          getViewportDimensions: () =>
            | {
                width: number
                height: number
              }
            | undefined
          isUsingVerticalWriting: () => boolean
          getIsReady: () => boolean
        }
        container: HTMLElement
        item: Manifest[`spineItems`][number]
        minimumWidth: number
        isImageType: () => boolean | undefined
      }) => void
    }
  | {
      name: "onViewportOffsetAdjust"
      runFn: (params: void) => void
    }
  /**
   * Only available during reader creation
   */
  | {
      name: `viewportNavigator.onBeforeContainerCreated`
      runFn: (params: { element: HTMLElement }) => void
    }
// | {
//     name: `item.onGetResource`
//     runFn: (
//       fetchResource: (item: Manifest[`spineItems`][number]) => Promise<Response>,
//     ) => (item: Manifest[`spineItems`][number]) => Promise<Response>
//   }

export type Params = Parameters<Hook["runFn"]>[0]

export type HookExecution = { name: string; id: string | undefined; destroyFn: () => Observable<unknown>; ref: Hook }

export type HookFrom<Name extends Hook["name"]> = Hook extends infer HK
  ? HK extends Hook
    ? HK["name"] extends Name
      ? HK
      : never
    : never
  : never

export type HookParamsFrom<Name extends Hook["name"]> = Parameters<HookFrom<Name>["runFn"]>[0]
