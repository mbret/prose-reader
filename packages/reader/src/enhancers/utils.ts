import { Enhancer } from "./types"
import { isHtmlElement } from "../utils/dom"

export const utilsEnhancer: Enhancer<
  {},
  {
    utils: {
      isOrIsWithinValidLink: (target: Event[`target`]) => boolean
    }
  }
> = (next) => (options) => {
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
