import { BehaviorSubject, EMPTY, from, fromEvent, isObservable, merge, Observable, of, Subject, Subscription } from "rxjs"
import { exhaustMap, filter, map, mapTo, mergeMap, share, take, takeUntil, delay, tap, withLatestFrom, switchMap, distinctUntilChanged } from "rxjs/operators"
import { Report } from "../.."
import { ITEM_EXTENSION_VALID_FOR_FRAME_SRC } from "../../constants"
import { Context } from "../../context"
import { Manifest } from "../../types"
import { Hook } from "../../types/Hook"
import { createFrame$ } from "./createFrame$"
import { createFrameManipulator } from "./createFrameManipulator"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"

const isOnLoadHook = (hook: Hook): hook is Extract<Hook, { name: `item.onLoad` }> => hook.name === `item.onLoad`

export const createLoader = ({ item, parent, fetchResource, hooks$, context, viewportState$ }: {
  item: Manifest[`spineItems`][number],
  parent: HTMLElement,
  fetchResource?: (item: Manifest[`spineItems`][number]) => Promise<Response>,
  hooks$: Observable<Hook[]>,
  context: Context,
  viewportState$: Observable<`free` | `busy`>
}) => {
  const destroySubject$ = new Subject<void>()
  const loadSubject$ = new Subject<void>()
  const unloadSubject$ = new Subject<void>()
  const frameElementSubject$ = new BehaviorSubject<HTMLIFrameElement | undefined>(undefined)
  const isLoadedSubject$ = new BehaviorSubject(false)
  const isReadySubject$ = new BehaviorSubject(false)
  let onLoadHookReturns: ((() => void) | Subscription | void)[] = []
  let computedStyleAfterLoad: CSSStyleDeclaration | undefined

  const makeItHot = <T>(source$: Observable<T>) => {
    source$.pipe(takeUntil(context.$.destroy$)).subscribe()

    return source$
  }

  const getHtmlFromResource = (response: Response) => {
    return createHtmlPageFromResource(response, item)
  }

  const waitForViewportFree$ = viewportState$.pipe(filter(v => v === `free`), take(1))

  const unload$ = unloadSubject$.asObservable()
    .pipe(
      // @todo remove iframe when viewport is free
      // @todo use takeUntil(load$) when it's the case to cancel
      withLatestFrom(frameElementSubject$),
      filter(([_, frame]) => !!frame),
      map(([, frame]) => {
        onLoadHookReturns.forEach(fn => {
          if (fn && `unsubscribe` in fn) {
            fn.unsubscribe()
          } else if (fn) {
            fn()
          }
        })
        onLoadHookReturns = []
        frame?.remove()
        frameElementSubject$.next(undefined)
      }),
      share(),
      takeUntil(destroySubject$)
    )

  /**
   * Observable for loading the frame
   */
  const load$ = loadSubject$.asObservable()
    .pipe(
      withLatestFrom(isLoadedSubject$),
      filter(([_, isLoaded]) => !isLoaded),
      // let's ignore later load as long as the first one still runs
      exhaustMap(() => {
        return createFrame$()
          .pipe(
            mergeMap((frame) => waitForViewportFree$.pipe(mapTo(frame))),
            mergeMap((frame) => {
              parent.appendChild(frame)

              frameElementSubject$.next(frame)

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
                (
                  // we have an encoding and it's a valid html
                  (item.mediaType && [`application/xhtml+xml`, `application/xml`, `text/html`, `text/xml`].includes(item.mediaType)) ||
                  // no encoding ? then try to detect html
                  (!item.mediaType && (ITEM_EXTENSION_VALID_FOR_FRAME_SRC.some(extension => item.href.endsWith(extension))))
                )
              ) {
                frame?.setAttribute(`src`, item.href)

                return of(frame)
              } else {
                const fetchFn = fetchResource || (() => fetch(item.href))

                return from(fetchFn(item))
                  .pipe(
                    mergeMap((response) => getHtmlFromResource(response)),
                    tap((htmlDoc) => {
                      frame?.setAttribute(`srcdoc`, htmlDoc)
                    }),
                    map(() => frame)
                  )
              }
            }),
            mergeMap((frame) => {
              if (!frame) return EMPTY

              frame.setAttribute(`sandbox`, `allow-same-origin allow-scripts`)

              return fromEvent(frame, `load`)
                .pipe(
                  take(1),
                  withLatestFrom(hooks$),
                  mergeMap(([_, hooks]) => {
                    const body: HTMLElement | undefined | null = frame.contentDocument?.body

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
                      computedStyleAfterLoad = frame?.contentWindow?.getComputedStyle(body)
                    }

                    if (context.getSettings().computedPageTurnMode !== `scrollable`) {
                      // @todo see what's the impact
                      frame.setAttribute(`tab-index`, `0`)
                    }

                    const manipulableFrame = createFrameManipulator(frame)

                    onLoadHookReturns = hooks
                      .filter(isOnLoadHook)
                      .map(hook => {
                        const hookReturn = hook.fn({
                          ...manipulableFrame,
                          item
                        })

                        if (hookReturn && `subscribe` in hookReturn) {
                          return hookReturn.subscribe()
                        }

                        return hookReturn
                      })

                    // we conveniently wait for all the hooks so that the dom is correctly prepared
                    // in addition to be ready.
                    // domReadySubject$.next(frame)

                    return of(frame)
                  })
                )
            }),
            // we stop loading as soon as unload is requested
            takeUntil(unloadSubject$)
          )
      }),
      share(),
      makeItHot,
      takeUntil(destroySubject$)
    )

  /**
   * Observable for when the frame is:
   * - loaded
   * - ready
   */
  const ready$ = load$
    .pipe(
      switchMap((frame) =>
        from(frame?.contentDocument?.fonts.ready || of(undefined))
          .pipe(
            takeUntil(unloadSubject$)
          )
      ),
      share(),
      makeItHot,
      takeUntil(destroySubject$)
    )

  merge(load$.pipe(mapTo(true)), unloadSubject$.pipe(mapTo(false)))
    .pipe(
      distinctUntilChanged(),
      takeUntil(destroySubject$)
    )
    .subscribe(isLoadedSubject$)

  merge(ready$.pipe(mapTo(true)), unloadSubject$.pipe(mapTo(false)))
    .pipe(
      distinctUntilChanged(),
      takeUntil(destroySubject$)
    )
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
      ready$: ready$,
      unloaded$: unload$,
      frameElement$: frameElementSubject$
    }
  }
}
