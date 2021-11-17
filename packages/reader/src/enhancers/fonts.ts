import { Enhancer } from "./types"

const FONT_WEIGHT = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
const FONT_JUSTIFICATION = [`center`, `left`, `right`, `justify`] as const

type Options = {
  fontScale?: number,
  lineHeight?: number,
  fontWeight?: typeof FONT_WEIGHT[number],
  fontJustification?: typeof FONT_JUSTIFICATION[number],
}

/**
 * @important
 * We don't apply font scaling on pre-paginated because it could potentially
 * break publisher scaling. Since it's specifically made for the given fixed layout
 * we should trust the publisher and not break its rendering.
 * @see 9781250213662
 *
 * Setting the font scale on body still has a chance to break publisher potential
 * font size on body if they already use something.
 * @see 9782714493743
 */
export const fontsEnhancer: Enhancer<Options, {
  /**
   * @description
   * Scale the font size. 1 means use default publisher/browser font size, 2 means 200%
   * 0.5 50%, etc
   */
  setFontScale: (scale: number) => void,

  /**
   * @description
   * Set the line height of the text. The default value is 1
   */
  setLineHeight: (value: number | undefined) => void,

  /**
   * @returns {(number|undefined)} value or publisher default when undefined
   */
  getLineHeight: () => number | undefined,

  /**
   * @description
   * Set font weight of text
   */
  setFontWeight: (value: typeof FONT_WEIGHT[number] | undefined) => void,

  /**
   * @returns {(number|undefined)} value or publisher default when undefined
   */
  getFontWeight: () => number | undefined,

  /**
   * @description
   * Set text align justification
   */
  setFontJustification: (value: typeof FONT_JUSTIFICATION[number] | `default`) => void,
}> = (next) => (options) => {
  const { fontScale = 1, lineHeight, fontWeight, fontJustification } = options
  const reader = next(options)
  let currentFontScale = fontScale
  let currentLineHeight = lineHeight
  let currentFontWeight = fontWeight
  let currentJustification = fontJustification

  const getStyle = () => `
    ${/*
      Ideally, we would like to use !important but it could break publisher specific
      cases.
      Also right now we do not apply it to * since it would also break publisher
      more specific scaling down the tree.

      body *:not([class^="mjx-"]) {
    */``}
    body {
      ${currentFontScale !== 1
      ? `font-size: ${currentFontScale}em !important;`
      : ``}
      ${currentLineHeight !== undefined
      ? `line-height: ${currentLineHeight} !important;`
      : ``}
      ${currentFontWeight !== undefined
      ? `font-weight: ${currentFontWeight} !important;`
      : ``}
      ${currentJustification !== undefined
      ? `text-align: ${currentJustification} !important;`
      : ``}
    }
  `

  const applyChangeToSpineItem = (requireLayout: boolean) => {
    reader.manipulateSpineItems(({ removeStyle, addStyle, item }) => {
      if (item.renditionLayout !== `pre-paginated`) {
        removeStyle(`oboku-reader-fonts`)
        addStyle(`oboku-reader-fonts`, getStyle())
      }

      return requireLayout
    })
  }

  reader.registerHook(`item.onLoad`, ({ removeStyle, addStyle, item }) => {
    if (item.renditionLayout !== `pre-paginated`) {
      removeStyle(`oboku-reader-fonts`)
      addStyle(`oboku-reader-fonts`, getStyle())
    }
  })

  return {
    ...reader,
    setFontScale: (scale: number) => {
      currentFontScale = scale
      applyChangeToSpineItem(true)
    },
    setLineHeight: (value: number | undefined) => {
      currentLineHeight = value
      applyChangeToSpineItem(true)
    },
    getLineHeight: () => currentLineHeight,
    setFontWeight: (value: typeof FONT_WEIGHT[number] | undefined) => {
      currentFontWeight = value
      applyChangeToSpineItem(false)
    },
    getFontWeight: () => currentFontWeight,
    setFontJustification: (value: typeof FONT_JUSTIFICATION[number] | `default`) => {
      currentJustification = value === `default` ? undefined : value
      applyChangeToSpineItem(false)
    }
  }
}
