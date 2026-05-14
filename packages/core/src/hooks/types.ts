import type { Manifest } from "@prose-reader/shared"
import type { Observable } from "rxjs"

export type AsyncHookParams = {
  signal: AbortSignal
}

export interface SyncHook<Name, Params, Result> {
  name: Name
  runFn: (params: Params) => Result
}

export interface AsyncHook<Name, Params, Result> {
  name: Name
  runFn: (params: AsyncHookParams & Params) => Promise<Result>
}

export type Hook<Name, Params, Result> =
  | SyncHook<Name, Params, Result>
  | AsyncHook<Name, Params, Result>

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
        documentContainer: HTMLElement
      }) => void
    }
  | {
      name: "cfi.afterGenerate"
      runFn: (params: {
        cfi: string
        spineItem: Manifest["spineItems"][number]
      }) => string | undefined
    }
  | {
      name: "cfi.beforeResolve"
      runFn: (params: { cfi: string }) => string | undefined
    }
  | {
      /**
       * Hook called as soon as the document is loaded.
       * You can take advantage of this hook to manipulate the loaded document, add styles,
       * update things around such as the dom etc. Note that the document is already
       * attached to the dom at this stage. If your operations can be done on the prepared layers
       * you should try to do so as much as possible.
       */
      name: `item.onDocumentLoad`
      runFn: (
        params: AsyncHookParams & {
          itemId: string
          documentContainer: HTMLElement
        },
      ) => Promise<void>
    }
  | {
      /**
       * Hook called before the loaded document is unloaded.
       */
      name: `item.onDocumentUnload`
      runFn: (
        params: AsyncHookParams & {
          itemId: string
          documentContainer: HTMLElement
        },
      ) => Promise<void>
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

// biome-ignore lint/suspicious/noExplicitAny: TODO
export type HookExecution<H extends Hook<any, any, any>> = {
  name: string
  id: string | undefined
  destroyFn: () => Observable<unknown>
  ref: H
}

export type HookFrom<
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  H extends Hook<any, any, any>,
  Name extends H["name"],
> = H extends infer HK
  ? HK extends H
    ? HK["name"] extends Name
      ? HK
      : never
    : never
  : never

export type HookParams<
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  H extends Hook<any, any, any>,
  Name extends H["name"],
> = Parameters<HookFrom<H, Name>["runFn"]>[0]

export type HookResult<
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  H extends Hook<any, any, any>,
  Name extends H["name"],
> = ReturnType<HookFrom<H, Name>["runFn"]>

export type AsyncHookName<
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  H extends Hook<any, any, any>,
> = H extends infer HK
  ? HK extends H
    ? ReturnType<HK["runFn"]> extends Promise<unknown>
      ? HK["name"]
      : never
    : never
  : never

export type SyncHookName<
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  H extends Hook<any, any, any>,
> = H extends infer HK
  ? HK extends H
    ? ReturnType<HK["runFn"]> extends Promise<unknown>
      ? never
      : HK["name"]
    : never
  : never
