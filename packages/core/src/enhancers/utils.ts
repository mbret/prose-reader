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
      injectScopedCSS: (
        doc: Document,
        scope: string,
        styleTemplate: string,
      ) => () => void
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

    const injectScopedCSS = (
      doc: Document,
      scope: string,
      styleTemplate: string,
    ) => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Expected
      const styleWithIdReplaced = styleTemplate.replace("${id}", reader.id)

      return injectCSS(doc, `${scope}-${reader.id}`, styleWithIdReplaced)
    }

    return {
      ...reader,
      utils: {
        isOrIsWithinValidLink,
        injectScopedCSS,
      },
    }
  }
