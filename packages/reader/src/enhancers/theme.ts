import { Enhancer } from "../createReader"

export type Theme = (typeof defaultThemes[number])[`name`]

const defaultThemes = [
  {
    name: `bright` as const,
    backgroundColor: `white`
  },
  {
    name: `sepia` as const,
    backgroundColor: `#eaddc7`,
    foregroundColor: `black`
  },
  {
    name: `night` as const,
    backgroundColor: `#191717`,
    foregroundColor: `#f1ebeb`
  }
]

export const themeEnhancer: Enhancer<{
  setTheme: (theme: Theme | undefined) => void,
  getTheme: () => Theme | undefined,
}> = (next) => (options) => {
  const { theme } = options
  const reader = next(options)
  let currentTheme = theme

  const getStyle = () => {
    const foundTheme = defaultThemes.find(entry => entry.name === currentTheme)

    return `
      body {
        ${foundTheme !== undefined
        ? `background-color: ${foundTheme.backgroundColor} !important;`
        : ``}
      }
      ${foundTheme?.foregroundColor
        ? `
          body * {
            ${/*
              Ideally, we would like to use !important but it could break publisher specific
              cases
            */``}
            color: ${foundTheme.foregroundColor};
          }
        `
        : ``}
    `
  }

  const applyChangeToReadingItemElement = ({ container, loadingElement }: { container: HTMLElement, loadingElement: HTMLElement }) => {
    const foundTheme = defaultThemes.find(entry => entry.name === currentTheme)
    if (foundTheme) {
      container.style.setProperty(`background-color`, foundTheme.backgroundColor)
      loadingElement.style.setProperty(`background-color`, foundTheme.backgroundColor)
    }
  }

  const applyChangeToReadingItem = () => {
    reader.manipulateReadingItems(({ removeStyle, addStyle, container, loadingElement }) => {
      removeStyle(`oboku-reader-theme`)
      addStyle(`oboku-reader-theme`, getStyle())
      applyChangeToReadingItemElement({ container, loadingElement })

      return false
    })
  }

  /**
   * Make sure to apply theme on item load
   */
  reader.registerHook(`item.onLoad`, ({ removeStyle, addStyle }) => {
    removeStyle(`oboku-reader-theme`)
    addStyle(`oboku-reader-theme`, getStyle())
  })

  /**
   * Make sure to apply theme on item container (fixed layout)
   * & loading element
   */
  reader.registerHook(`item.onCreated`, applyChangeToReadingItemElement)

  return {
    ...reader,
    setTheme: (theme: Theme | undefined) => {
      currentTheme = theme
      applyChangeToReadingItem()
    },
    getTheme: () => currentTheme
  }
}
