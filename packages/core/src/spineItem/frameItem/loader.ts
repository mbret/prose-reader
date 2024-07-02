/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  from,
  fromEvent,
  merge,
  Observable,
  of,
  Subject,
  Subscription,
} from "rxjs"
import {
  exhaustMap,
  filter,
  map,
  mergeMap,
  share,
  take,
  takeUntil,
  tap,
  withLatestFrom,
  switchMap,
  distinctUntilChanged,
  catchError,
} from "rxjs/operators"
import { Report } from "../.."
import { ITEM_EXTENSION_VALID_FOR_FRAME_SRC } from "../../constants"
import { Context } from "../../context/Context"
import { Manifest } from "../../types"
import { createFrame$ } from "./createFrame$"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { HookManager } from "../../hooks/HookManager"

export const createLoader = ({
  item,
  parent,
  context,
  viewportState$,
  settings,
  hookManager,
}: {
  item: Manifest[`spineItems`][number]
  parent: HTMLElement
  context: Context
  settings: ReaderSettingsManager
  viewportState$: Observable<`free` | `busy`>
  hookManager: HookManager
}) => {
  const destroySubject$ = new Subject<void>()
  const loadSubject$ = new Subject<void>()
  const unloadSubject$ = new Subject<void>()
  const frameElementSubject$ = new BehaviorSubject<
    HTMLIFrameElement | undefined
  >(undefined)
  const isLoadedSubject$ = new BehaviorSubject(false)
  const isReadySubject$ = new BehaviorSubject(false)
  // let onLoadHookReturns: ((() => void) | Subscription | void)[] = []
  let computedStyleAfterLoad: CSSStyleDeclaration | undefined

  const makeItHot = <T>(source$: Observable<T>) => {
    source$.pipe(takeUntil(context.destroy$)).subscribe()

    return source$
  }

  const getHtmlFromResource = (response: Response) =>
    createHtmlPageFromResource(response, item)

  const waitForViewportFree$ = viewportState$.pipe(
    filter((v) => v === `free`),
    take(1),
  )

  const unload$ = unloadSubject$.asObservable().pipe(
    // @todo remove iframe when viewport is free
    // @todo use takeUntil(load$) when it's the case to cancel
    withLatestFrom(frameElementSubject$),
    filter(([_, frame]) => !!frame),
    map(([, frame]) => {
      hookManager.destroy(`item.onLoad`, item.id)

      frame?.remove()

      frameElementSubject$.next(undefined)
    }),
    share(),
    takeUntil(destroySubject$),
  )

  /**
   * Observable for loading the frame
   */
  const load$ = loadSubject$.asObservable().pipe(
    withLatestFrom(isLoadedSubject$),
    filter(([_, isLoaded]) => !isLoaded),
    // let's ignore later load as long as the first one still runs
    exhaustMap(() => {
      return createFrame$().pipe(
        mergeMap((frame) => waitForViewportFree$.pipe(map(() => frame))),
        mergeMap((frame) => {
          parent.appendChild(frame)

          frameElementSubject$.next(frame)

          const { fetchResource } = settings.settings

          /**
           * Because of the bug with iframe and sw, we should not use srcdoc and sw together for
           * html document. This is because resources will not pass through SW. IF `fetchResource` is being
           * used the user should be aware of the limitation. We use srcdoc for everything except if we detect
           * an html document and same origin. Hopefully that bug gets fixed one day.
           * @see https://bugs.chromium.org/p/chromium/issues/detail?id=880768
           */
          if (
            !fetchResource &&
            item.href.startsWith(window.location.origin) &&
            // we have an encoding and it's a valid html
            ((item.mediaType &&
              [
                `application/xhtml+xml`,
                `application/xml`,
                `text/html`,
                `text/xml`,
              ].includes(item.mediaType)) ||
              // no encoding ? then try to detect html
              (!item.mediaType &&
                ITEM_EXTENSION_VALID_FOR_FRAME_SRC.some((extension) =>
                  item.href.endsWith(extension),
                )))
          ) {
            frame?.setAttribute(`src`, item.href)

            return of(frame)
          } else {
            const fetchFn = fetchResource || (() => fetch(item.href))

            return from(fetchFn(item)).pipe(
              mergeMap((response) => getHtmlFromResource(response)),
              tap((htmlDoc) => {
                if (htmlDoc) {
                  frame?.setAttribute(`srcdoc`, htmlDoc)
                }
              }),
              map(() => frame),
              catchError((e) => {
                Report.error(
                  `Error while trying to fetch or load resource for item ${item.id}`,
                )
                console.error(e)

                return of(frame)
              }),
            )
          }
        }),

        mergeMap((frame) => {
          if (!frame) return EMPTY

          // We don't need sandbox since we are actually already allowing too much to the iframe
          // frame.setAttribute(`sandbox`, `allow-same-origin allow-scripts`)

          return fromEvent(frame, `load`).pipe(
            take(1),
            mergeMap(() => {
              const body: HTMLElement | undefined | null =
                frame.contentDocument?.body

              if (!body) {
                Report.error(`Something went wrong on iframe load ${item.id}`)

                return EMPTY
              }
              // console.log(frame.contentDocument?.head.childNodes)
              // console.log(frame.contentDocument?.body.childNodes)

              // const script = frame.contentDocument?.createElement(`script`)
              // // script?.setAttribute(`src`, `https://fred-wang.github.io/mathml.css/mspace.js`)
              // // script?.setAttribute(`src`, `https://fred-wang.github.io/mathjax.js/mpadded-min.js`)
              // // script?.setAttribute(`src`, `https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js`)
              // // script?.setAttribute(`src`, `https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-AMS-MML_CHTML`)
              // if (script) {
              //   // console.log(frame.contentDocument?.head.childNodes)
              //   // console.log(frame.contentDocument?.body.childNodes)
              //   // frame.contentDocument?.head.appendChild(script)
              // }

              frame.setAttribute(`role`, `main`)

              if (frame?.contentDocument && body) {
                computedStyleAfterLoad =
                  frame?.contentWindow?.getComputedStyle(body)
              }

              if (settings.settings.computedPageTurnMode !== `scrollable`) {
                // @todo see what's the impact
                frame.setAttribute(`tab-index`, `0`)
              }

              // we conveniently wait for all the hooks so that the dom is correctly prepared
              // in addition to be ready.
              // domReadySubject$.next(frame)

              const hookResults = hookManager
                .execute(`item.onLoad`, item.id, {
                  itemId: item.id,
                  frame,
                })
                .filter(
                  (result): result is Observable<void> =>
                    result instanceof Observable,
                )

              return combineLatest([of(null), ...hookResults]).pipe(
                map(() => frame),
              )
            }),
          )
        }),

        // we stop loading as soon as unload is requested
        takeUntil(unloadSubject$),
      )
    }),
    share(),
    makeItHot,
    takeUntil(destroySubject$),
  )

  /**
   * Observable for when the frame is:
   * - loaded
   * - ready
   */
  const ready$ = load$.pipe(
    switchMap((frame) =>
      from(frame?.contentDocument?.fonts.ready || of(undefined)).pipe(
        takeUntil(unloadSubject$),
      ),
    ),
    share(),
    makeItHot,
    takeUntil(destroySubject$),
  )

  merge(load$.pipe(map(() => true)), unloadSubject$.pipe(map(() => false)))
    .pipe(distinctUntilChanged(), takeUntil(destroySubject$))
    .subscribe(isLoadedSubject$)

  merge(ready$.pipe(map(() => true)), unloadSubject$.pipe(map(() => false)))
    .pipe(distinctUntilChanged(), takeUntil(destroySubject$))
    .subscribe(isReadySubject$)

  unload$.subscribe()

  return {
    load: () => loadSubject$.next(),
    unload: () => unloadSubject$.next(),
    destroy: () => {
      loadSubject$.complete()
      unloadSubject$.complete()
      frameElementSubject$.complete()
      destroySubject$.next()
      destroySubject$.complete()
      isReadySubject$.complete()
      isLoadedSubject$.complete()
    },
    getComputedStyleAfterLoad: () => computedStyleAfterLoad,
    $: {
      load$: loadSubject$.asObservable(),
      unload$: unloadSubject$.asObservable(),
      loaded$: load$,
      isLoaded$: isLoadedSubject$.asObservable(),
      isReady$: isReadySubject$.asObservable().pipe(distinctUntilChanged()),
      ready$,
      unloaded$: unload$,
      frameElement$: frameElementSubject$,
    },
  }
}
