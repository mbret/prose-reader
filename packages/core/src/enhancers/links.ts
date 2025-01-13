import { type Observable, Subject } from "rxjs"
import { Report } from "../report"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "./types/enhancer"
import type { NavigationEnhancerOutput } from "./navigation/types"

type SubjectData = {
  event: `linkClicked`
  data: HTMLAnchorElement
  isNavigable: boolean
}

export const linksEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer> &
      NavigationEnhancerOutput,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    $: {
      links$: Observable<SubjectData>
    }
  } => {
    const reader = next(options)
    const subject = new Subject<SubjectData>()

    const handleNavigationForClick = (element: HTMLAnchorElement) => {
      if (!element.href) return false

      const hrefUrl = new URL(element.href)
      const hrefWithoutAnchor = `${hrefUrl.origin}${hrefUrl.pathname}`
      // internal link, we can handle
      const hasExistingSpineItem = reader.context.manifest?.spineItems.some(
        (item) => item.href === hrefWithoutAnchor,
      )
      if (hasExistingSpineItem) {
        reader.navigation.goToUrl(hrefUrl)

        return true
      }

      return false
    }

    reader.hookManager.register(`item.onDocumentLoad`, ({ itemId }) => {
      const item = reader.spineItemsManager.get(itemId)
      const frame = item?.renderer.getDocumentFrame()

      if (!frame) return

      if (frame?.contentDocument) {
        Array.from(frame.contentDocument.querySelectorAll(`a`)).forEach(
          (element) =>
            element.addEventListener(`click`, (e) => {
              if (
                e.target &&
                `style` in e.target &&
                `ELEMENT_NODE` in e.target
              ) {
                Report.warn(`prevented click on`, element, e)

                e.preventDefault()

                const isNavigable = handleNavigationForClick(element)

                subject.next({
                  event: `linkClicked`,
                  data: element,
                  isNavigable,
                })
              }
            }),
        )
      }
    })

    return {
      ...reader,
      $: {
        ...reader.$,
        links$: subject.asObservable(),
      },
    }
  }
