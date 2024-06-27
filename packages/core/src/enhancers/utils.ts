import { isHtmlElement } from "../utils/dom"
import { EnhancerOutput, RootEnhancer } from "./types/enhancer"

export const utilsEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (
    options: InheritOptions,
  ): InheritOutput & {
    utils: {
      isOrIsWithinValidLink: (target: Event[`target`]) => boolean
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

    return {
      ...reader,
      utils: {
        isOrIsWithinValidLink,
      },
    }
  }
