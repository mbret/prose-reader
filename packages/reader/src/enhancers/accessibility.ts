import { Enhancer } from "../createReader";

/**
 * 
 */
export const accessibilityEnhancer: Enhancer<{

}> = (next) => (options) => {
  const reader = next(options)

  const observer = new IntersectionObserver((entries, observer) => {
    console.log(entries, observer)
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.removeAttribute(`tab-index`)
      } else {
        entry.target.setAttribute(`tab-index`, `-1`)
      }
    })
  }, {
  })

  reader.registerHook(`item.onLoad`, ({ addStyle, frame }) => {
    addStyle(`oboku-reader-accessibility`, `
      :focus-visible {
        ${/* 
          Some epubs remove the outline, this is not good practice since it reduce accessibility.
          We will try to restore it by force.
        */``}
        outline: -webkit-focus-ring-color auto 1px;
      }
    `)

    const links = frame.contentDocument?.body.querySelectorAll(`a`)

    links?.forEach(link => {
      observer.observe(link)
    })

    return () => {
      links?.forEach(link => {
        observer.unobserve(link)
      })
    }
  })

  return {
    ...reader,
  }
}