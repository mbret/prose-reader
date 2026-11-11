import { injectCSS, isHtmlElement } from "../utils/dom"
import type { EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const utilsEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    utils: {
      isOrIsWithinValidLink: (target: Event[`target`]) => boolean
      /**
       * Injects `styleTemplate` into the reader's document, with every
       * `${id}` replaced by the reader's id, and returns a function that
       * removes it.
       */
      injectScopedCSS: (scope: string, styleTemplate: string) => () => void
    }
  } => {
    const reader = next(options)

    const isOrIsWithinValidLink = (target: Event[`target`]) => {
      if (isHtmlElement(target)) {
        const link = target.nodeName === `a` ? target : target.closest(`a`)
        if (link?.getAttribute(`href`)) {
          return true
        }
      }

      return false
    }

    const injectScopedCSS = (scope: string, styleTemplate: string) => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Expected
      const styleWithIdReplaced = styleTemplate.replaceAll("${id}", reader.id)

      return injectCSS(
        reader.context.document,
        `${scope}-${reader.id}`,
        styleWithIdReplaced,
      )
    }

    return {
      ...reader,
      utils: {
        isOrIsWithinValidLink,
        injectScopedCSS,
      },
    }
  }
