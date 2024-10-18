import { EnhancerOutput, RootEnhancer } from "./types/enhancer"

/**
 *
 */
export const accessibilityEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.removeAttribute(`tab-index`)
        } else {
          entry.target.setAttribute(`tab-index`, `-1`)
        }
      })
    }, {})

    reader.hookManager.register(`item.onDocumentLoad`, ({ itemId, frame, destroy }) => {
      const item = reader.spineItemsManager.get(itemId)

      if (!item) return

      item.upsertCSS(
        `prose-reader-accessibility`,
        `
        :focus-visible {
          ${
            /*
            Some epubs remove the outline, this is not good practice since it reduce accessibility.
            We will try to restore it by force.
          */ ``
          }
          outline: -webkit-focus-ring-color auto 1px;
        }
      `,
      )

      const links = frame.contentDocument?.body.querySelectorAll(`a`)

      links?.forEach((link) => {
        observer.observe(link)
      })

      destroy(() => {
        links?.forEach((link) => {
          observer.unobserve(link)
        })
      })
    })

    return {
      ...reader,
    }
  }
