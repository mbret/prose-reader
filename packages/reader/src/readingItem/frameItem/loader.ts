import { BehaviorSubject, EMPTY, from, fromEvent, Observable, of, Subject } from "rxjs"
import { exhaustMap, filter, map, mapTo, mergeMap, share, take, takeUntil, tap, withLatestFrom } from "rxjs/operators"
import { Report } from "../.."
import { ITEM_EXTENSION_VALID_FOR_FRAME_SRC } from "../../constants"
import { Context } from "../../context"
import { Manifest } from "../../types"
import { Hook } from "../../types/Hook"
import { createFrame$ } from "./createFrame$"
import { createFrameManipulator } from "./createFrameManipulator"
import { createHtmlPageFromResource } from "./createHtmlPageFromResource"

const isOnLoadHook = (hook: Hook): hook is Extract<Hook, { name: `item.onLoad` }> => hook.name === `item.onLoad`

export const createLoader = ({ item, stateSubject$, parent, fetchResource, hooks$, context, viewportState$ }: {
  item: Manifest[`readingOrder`][number],
  stateSubject$: BehaviorSubject<{
    isReady: boolean,
    isLoading: boolean,
    frameLoaded: boolean
  }>,
  parent: HTMLElement,
  fetchResource?: (item: Manifest[`readingOrder`][number]) => Promise<Response>,
  hooks$: Observable<Hook[]>,
  context: Context,
  viewportState$: Observable<"free" | "busy">
}) => {
  const destroySubject$ = new Subject<void>()
  const loadSubject$ = new Subject<void>()
  const unloadSubject$ = new Subject<void>()
  const frameElementSubject$ = new BehaviorSubject<HTMLIFrameElement | undefined>(undefined)
  let hookDestroyFunctions: ReturnType<Extract<Hook, { name: `item.onLoad` }>[`fn`]>[] = []
  let computedStyleAfterLoad: CSSStyleDeclaration | undefined

  const getHtmlFromResource = (response: Response) => {
    return createHtmlPageFromResource(response, item)
  }

  const getManipulableFrame = () => {
    const frame = frameElementSubject$.getValue()
    if (stateSubject$.getValue().frameLoaded && frame) {
      return createFrameManipulator(frame)
    }
  }

  const waitForViewportFree$ = viewportState$.pipe(filter(v => v === `free`), take(1))

  const load$ = loadSubject$.asObservable()
    .pipe(
      // let's ignore later load as long as the first one still runs
      exhaustMap(() => {
        stateSubject$.next({
          isLoading: true,
          isReady: false,
          frameLoaded: false
        })

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

              // fromEvent(frame, `DOMFrameContentLoaded`)
              //   .pipe(
              //     tap(() => {
              //       debugger
              //     })
              //   ).subscribe()

              return fromEvent(frame, `load`)
                .pipe(
                  withLatestFrom(hooks$),
                  mergeMap(([_, hooks]) => {
                    const body: HTMLElement | undefined | null = frame.contentDocument?.body

                    if (!body) {
                      Report.error(`Something went wrong on iframe load ${item.id}`)

                      return of(undefined)
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

                    if (context.getSettings().computedPageTurnMode !== `free`) {
                      // @todo see what's the impact
                      frame.setAttribute(`tab-index`, `0`)
                    }

                    stateSubject$.next({
                      ...stateSubject$.getValue(),
                      frameLoaded: true
                    })

                    const manipulableFrame = getManipulableFrame()

                    hookDestroyFunctions = hooks
                      .filter(isOnLoadHook)
                      .map(hook => manipulableFrame && hook.fn({ ...manipulableFrame, item }))

                    // we conveniently wait for all the hooks so that the dom is correctly prepared
                    // in addition to be ready.
                    // domReadySubject$.next(frame)

                    return from(frame.contentDocument?.fonts.ready || of(undefined))
                      .pipe(
                        tap(() => {
                          // @todo hook onContentReady, dom is ready + first fonts are ready. we can assume is kind of already good enough

                          stateSubject$.next({
                            ...stateSubject$.getValue(),
                            isLoading: false,
                            isReady: true
                          })
                        })
                      )
                  })
                )
            }),
            // we stop loading as soon as unload is requested
            takeUntil(unloadSubject$)
          )
      }),
      share(),
      takeUntil(destroySubject$)
    )

  load$.subscribe()

  const unload$ = unloadSubject$.asObservable()
    .pipe(
      withLatestFrom(frameElementSubject$),
      filter(([_, frame]) => !!frame),
      exhaustMap(() => {
        stateSubject$.next({
          isLoading: false,
          isReady: false,
          frameLoaded: false
        })
        hookDestroyFunctions.forEach(fn => fn && fn())
        frameElementSubject$.getValue()?.remove()
        frameElementSubject$.next(undefined)

        // @todo remove iframe when viewport is free

        return of(undefined).pipe(
          takeUntil(load$)
        )
      }),
      share(),
      takeUntil(destroySubject$)
    )

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
    },
    getComputedStyleAfterLoad: () => computedStyleAfterLoad,
    load$: loadSubject$.asObservable(),
    unload$: unloadSubject$.asObservable(),
    loaded$: load$,
    unloaded$: unload$,
    frameElement$: frameElementSubject$
  }
}
