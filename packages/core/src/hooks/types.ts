import type { Manifest } from "@prose-reader/shared"
import type { Observable } from "rxjs"

// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
export type UserDestroyFn = () => void | Observable<unknown>

export interface Hook<Name, Params, Result> {
  name: Name
  runFn: (params: Params) => Result
}

export type CoreHook =
  | {
      /*
       * Hook called as soon as the renderer document is created (not loaded) and not attached to the
       * dom. You can take advantage of this hook to manipulate the document, prepare
       * styles, do some operations, etc. Your actions might be limited since at this stage
       * the document content is not known.
       */
      name: `item.onDocumentCreated`
      runFn: (params: {
        itemId: string
        layers: { element: HTMLElement }[]
      }) => Observable<void> | void
    }
  | {
      /**
       * Hook called as soon as the document is loaded.
       * You can take advantage of this hook to manipulate the loaded document, add styles,
       * update things arounds such as the dom etc. Note that the document is already
       * attached to the dom at this stage. If your operations can be done on the prepared layers
       * you should try to do so as much as possible.
       */
      name: `item.onDocumentLoad`
      runFn: (params: {
        destroy$: Observable<void>
        destroy: (fn: UserDestroyFn) => void
        itemId: string
        layers: { element: HTMLElement }[]
      }) => Observable<void> | void
    }
  | {
      name: "item.onBeforeLayout"
      runFn: (params: {
        blankPagePosition: "before" | "after" | "none"
        item: Manifest["spineItems"][number]
        minimumWidth: number
      }) => void
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
  | {
      name: "onViewportOffsetAdjust"
      runFn: (params: undefined) => void
    }
  /**
   * Only available during reader creation
   */
  | {
      name: `navigator.onBeforeContainerCreated`
      runFn: (params: { element: HTMLElement }) => void
    }

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type HookExecution<H extends Hook<any, any, any>> = {
  name: string
  id: string | undefined
  destroyFn: () => Observable<unknown>
  ref: H
}

export type HookFrom<
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  H extends Hook<any, any, any>,
  Name extends H["name"],
> = H extends infer HK
  ? HK extends H
    ? HK["name"] extends Name
      ? HK
      : never
    : never
  : never
