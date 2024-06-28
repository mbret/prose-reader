const FONT_WEIGHT = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
const FONT_JUSTIFICATION = [`center`, `left`, `right`, `justify`] as const

export type InputSettings = {
  /**
   * @description
   * Scale the font size. 1 means use default publisher/browser font size, 2 means 200%
   * 0.5 50%, etc
   */
  fontScale: number
  /**
   * @description
   * Set the line height of the text. The default value is 1
   */
  lineHeight: number | `publisher`
  /**
   * @description
   * Set font weight of text
   */
  fontWeight: (typeof FONT_WEIGHT)[number] | `publisher`
  /**
   * @description
   * Set text align justification
   */
  fontJustification: (typeof FONT_JUSTIFICATION)[number] | `publisher`
}
