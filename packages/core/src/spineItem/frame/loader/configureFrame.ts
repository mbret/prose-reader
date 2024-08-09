import { combineLatest, EMPTY, map, mergeMap, Observable, of } from "rxjs"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { Report } from "../../../report"
import { Manifest } from "@prose-reader/shared"
import { HookManager } from "../../.."

export const configureFrame = ({
  settings,
  item,
  hookManager,
}: {
  settings: ReaderSettingsManager
  item: Manifest[`spineItems`][number]
  hookManager: HookManager
}) => {
  return (stream: Observable<HTMLIFrameElement>) =>
    stream.pipe(
      // We don't need sandbox since we are actually already allowing too much to the iframe
      // frame.setAttribute(`sandbox`, `allow-same-origin allow-scripts`)
      mergeMap((frame) => {
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
          // computedStyleAfterLoad = frame?.contentWindow?.getComputedStyle(body)
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

        return combineLatest([of(null), ...hookResults]).pipe(map(() => frame))
      }),
    )
}
