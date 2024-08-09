/* eslint-disable @typescript-eslint/no-unused-vars */
import { BehaviorSubject, merge, of, Subject } from "rxjs"
import {
  exhaustMap,
  filter,
  share,
  takeUntil,
  tap,
  switchMap,
  first,
  map,
  distinctUntilChanged,
  withLatestFrom,
} from "rxjs/operators"
import { Context } from "../../../context/Context"
import { Manifest } from "../../.."
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { HookManager } from "../../../hooks/HookManager"
import { waitForSwitch } from "../../../utils/rxjs"
import { loadFrame } from "./loadFrame"
import { unloadFrame } from "./unloadFrame"
import { waitForFrameReady } from "./waitForFrameReady"

export const createLoader = ({
  item,
  parent,
  context,
  settings,
  hookManager,
}: {
  item: Manifest[`spineItems`][number]
  parent: HTMLElement
  context: Context
  settings: ReaderSettingsManager
  hookManager: HookManager
}) => {
  const destroySubject$ = new Subject<void>()
  const stateSubject = new BehaviorSubject<
    "idle" | "loading" | "loaded" | "unloading" | "ready"
  >("idle")
  const loadSubject = new Subject<void>()
  const unloadSubject = new Subject<void>()
  const frameElementSubject = new BehaviorSubject<
    HTMLIFrameElement | undefined
  >(undefined)
  const load$ = loadSubject.asObservable()
  const unload$ = unloadSubject.asObservable()
  const stateIdle$ = stateSubject.pipe(filter((state) => state === "idle"))
  const stateIsReady$ = stateSubject.pipe(
    map((state) => state === "ready"),
    distinctUntilChanged(),
  )

  const unloaded$ = unload$.pipe(
    withLatestFrom(stateSubject),
    filter(([, state]) => state !== "unloading" && state !== "idle"),
    exhaustMap(() => {
      stateSubject.next("unloading")

      return unloadFrame({
        hookManager,
        item,
        frameElement: frameElementSubject.getValue(),
        context,
      }).pipe(
        tap(() => {
          frameElementSubject.next(undefined)

          stateSubject.next("idle")
        }),
      )
    }),
    share(),
  )

  const loaded$ = load$.pipe(
    exhaustMap(() =>
      stateIdle$.pipe(
        first(),
        tap(() => {
          stateSubject.next("loading")
        }),
        waitForSwitch(context.bridgeEvent.viewportFree$),
        switchMap(() =>
          loadFrame({
            element: parent,
            hookManager,
            item,
            onFrameElement: (element) => {
              frameElementSubject.next(element)
            },
            settings,
            context,
          }),
        ),
        tap(() => {
          stateSubject.next("loaded")
        }),
        takeUntil(unload$),
      ),
    ),
    share(),
  )

  const ready$ = loaded$.pipe(
    switchMap((frame) =>
      of(frame).pipe(
        waitForFrameReady,
        tap(() => {
          stateSubject.next("ready")
        }),
        takeUntil(unload$),
      ),
    ),
    share(),
  )

  merge(unloaded$, loaded$, ready$).pipe(takeUntil(destroySubject$)).subscribe()

  return {
    load: () => loadSubject.next(),
    unload: () => unloadSubject.next(),
    destroy: () => {
      unloadSubject.next()
      unloadSubject.complete()
      loadSubject.complete()
      frameElementSubject.complete()
      destroySubject$.next()
      destroySubject$.complete()
    },
    get state() {
      return stateSubject.getValue()
    },
    get element() {
      return frameElementSubject.getValue()
    },
    isReady$: stateIsReady$,
    ready$,
    loaded$,
    unloaded$,
    element$: frameElementSubject.asObservable(),
  }
}
