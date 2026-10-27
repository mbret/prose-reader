export type Theme = `bright` | `sepia` | `night` | `publisher`

export type EnhancerThemeInputSettings = {
  /**
   * The colors the reader paints: the background of its container, of the
   * placeholder of a loading item and of reflowable documents, the text of the
   * placeholder and, with `sepia` and `night`, the text of reflowable
   * documents. `publisher` keeps the book's colors, on a white reader.
   * Pre-paginated documents always keep theirs.
   */
  theme: Theme
}
