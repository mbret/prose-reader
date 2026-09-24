import { takeUntil, tap } from "rxjs"
import type {
  NavigationTargetOf,
  UserNavigationEntry,
} from "../../navigation/types"
import { Report } from "../../report"
import { isHtmlTagElement } from "../../utils/dom"
import type { HtmlEnhancerOutput } from "../html/enhancer"
import type {
  EnhancerOptions,
  EnhancerOutput,
  RootEnhancer,
} from "../types/enhancer"
import { getUrlNavigationTarget } from "./getUrlNavigationTarget"

const report = Report.namespace(`urlNavigation`)

/** The url of a spine item, optionally with an element id as its fragment. */
export type UrlNavigationTarget = { type: "url"; value: string | URL }

export type UrlNavigationEnhancerOutput<InheritOutput> = {
  navigation: {
    navigate: (
      to: UserNavigationEntry<
        NavigationTargetOf<InheritOutput> | UrlNavigationTarget
      >,
    ) => void
    goToUrl: (url: string | URL) => void
  }
}

/**
 * Adds the `url` navigation target, and follows links between the book's
 * documents. A url is translated into a `node` target, which finds its
 * element once its document is loaded.
 */
export const urlNavigationEnhancer =
  <
    InheritOptions extends EnhancerOptions<RootEnhancer>,
    InheritOutput extends EnhancerOutput<RootEnhancer> & HtmlEnhancerOutput,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & UrlNavigationEnhancerOutput<InheritOutput> => {
    const reader = next(options)
    // The inherited `navigate` accepts every target this one does but `url`,
    // which is what `NavigationTargetOf` reads from it; TS cannot follow that
    // through the generic reader.
    const navigateInherited = reader.navigation.navigate as (
      to: UserNavigationEntry<NavigationTargetOf<InheritOutput>>,
    ) => void

    const navigate = (
      to: UserNavigationEntry<
        NavigationTargetOf<InheritOutput> | UrlNavigationTarget
      >,
    ) => {
      const { target } = to

      if (target.type !== "url") return navigateInherited({ ...to, target })

      const nodeTarget = getUrlNavigationTarget(
        target.value,
        reader.context.manifest,
      )

      if (!nodeTarget) {
        report.warn(`Ignore navigation to ${target.value}, outside the book`)

        return
      }

      reader.navigation.navigate({ ...to, target: nodeTarget })
    }

    const goToUrl = (url: string | URL) =>
      navigate({ target: { type: "url", value: url }, animation: false })

    reader.links$
      .pipe(
        tap((event) => {
          // The link listened to, rather than what was clicked inside it.
          const link = event.currentTarget

          if (!isHtmlTagElement(link, "a") || event.type !== "click") return

          const href = link.getAttribute("href")
          // A document loaded from a blob cannot resolve a relative href on
          // its own, so it is resolved against its spine item's.
          const spineItem = reader.spineItemsManager.items.find(
            (item) =>
              item.renderer.getDocumentFrame()?.contentDocument ===
              link.ownerDocument,
          )

          if (!href || !spineItem) return

          const target = getUrlNavigationTarget(
            href,
            reader.context.manifest,
            spineItem.item.href,
          )

          if (target) reader.navigation.navigate({ target, animation: false })
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return {
      ...reader,
      navigation: {
        ...reader.navigation,
        navigate,
        goToUrl,
      },
    }
  }
