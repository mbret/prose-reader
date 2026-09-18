/**
 * What crengine makes of a text node's characters, and how its offsets map to
 * the raw DOM text. Every rule is from `PreProcessXmlString`, `ExpandTabs` and
 * `LVXMLParser::ReadText` in crengine/src/lvxml.cpp and
 * `ldomElementWriter::onText` in crengine/src/lvtinydom.cpp.
 *
 * crengine strings are UTF-32, so its offsets count code points; DOM offsets
 * count UTF-16 units. Both conversions live here.
 */

/** `TEXT_SPLIT_SIZE` (crengine/src/lvxml.cpp): longer text becomes several text nodes. */
export const CRENGINE_TEXT_SPLIT_SIZE = 8192

export type TextMode = {
  /** `white-space: pre` and friends: whitespace kept, tabs expanded. */
  pre: boolean
  /** First text of a `<pre>` / `<textarea>`: a leading newline is dropped. */
  stripsLeadingNewline: boolean
  /** MathML token text: blanks at both ends removed after the whitespace pass. */
  trim?: boolean
}

export type TextPiece = {
  /** UTF-16 range in the raw text node data. */
  start: number
  end: number
}

const TAB = 9
const LF = 10
const CR = 13
const SPACE = 32

const isSpaceLike = (codePoint: number) =>
  codePoint === SPACE ||
  codePoint === CR ||
  codePoint === LF ||
  codePoint === TAB

/** `IsEmptySpace` (crengine/src/lvtinydom.cpp): only these four count as space; NBSP does not. */
export const isEmptySpace = (text: string): boolean => {
  for (let index = 0; index < text.length; index++) {
    const charCode = text.charCodeAt(index)

    if (
      charCode !== SPACE &&
      charCode !== CR &&
      charCode !== LF &&
      charCode !== TAB
    )
      return false
  }

  return true
}

const codePointLength = (codePoint: number) => (codePoint > 0xffff ? 2 : 1)

/**
 * Visits the raw text code point by code point with the number of characters
 * crengine keeps for it (`units`): 0 for a collapsed space or a dropped
 * carriage return, up to 8 for an expanded tab, 1 otherwise. Stops early when
 * the visitor returns `false`.
 */
const visitCodePoints = (
  text: string,
  mode: TextMode,
  visit: (rawIndex: number, rawLength: number, units: number) => boolean,
) => {
  let index = 0

  if (!mode.pre) {
    // Outside pre: \r, \n and \t become spaces and a run of spaces keeps its
    // first one. Trimming (MathML) then removes the space at either end.
    let precedingSpaces = 0
    let emitted = 0
    let lastKept = text.length

    if (mode.trim) {
      while (lastKept > 0 && isSpaceLike(text.charCodeAt(lastKept - 1)))
        lastKept--
    }

    while (index < text.length) {
      const codePoint = text.codePointAt(index) ?? 0
      const length = codePointLength(codePoint)
      let units = 1

      if (isSpaceLike(codePoint)) {
        units = precedingSpaces === 0 ? 1 : 0
        precedingSpaces++

        if (mode.trim && (emitted === 0 || index >= lastKept)) units = 0
      } else {
        precedingSpaces = 0
      }

      emitted += units

      if (!visit(index, length, units)) return

      index += length
    }

    return
  }

  // Inside pre: \r\n and lone \r become \n, tabs expand to 8-column stops
  // (columns counted from the start of the text node, a newline itself
  // being column 1 of its line), and the first character is dropped when it
  // is the newline that follows a <pre> start tag.
  let lastChar = 0
  let column = 0
  let stripNewline = mode.stripsLeadingNewline

  while (index < text.length) {
    const codePoint = text.codePointAt(index) ?? 0
    const length = codePointLength(codePoint)
    let units = 1
    let newline = false

    if (codePoint === CR) {
      const next =
        index + length < text.length
          ? text.codePointAt(index + length)
          : undefined
      const kept = (index === 0 || lastChar !== LF) && next !== LF

      if (kept) {
        newline = true
        lastChar = LF
      } else {
        units = 0
      }
    } else if (codePoint === LF) {
      newline = true
      lastChar = LF
    } else if (codePoint === TAB) {
      units = 8 - (column & 7)
      column += units
      lastChar = TAB
    } else {
      column++
      lastChar = codePoint
    }

    if (newline) {
      // ExpandTabs resets the column, then counts the newline itself.
      column = 1
    }

    if (units > 0 && stripNewline) {
      stripNewline = false

      if (newline) units = 0
    }

    if (!visit(index, length, units)) return

    index += length
  }
}

/** Length of crengine's text, in code points. */
export const getCrengineTextLength = (text: string, mode: TextMode) => {
  let length = 0

  visitCodePoints(text, mode, (_rawIndex, _rawLength, units) => {
    length += units

    return true
  })

  return length
}

/**
 * crengine offset (code points of the normalised text) of a raw UTF-16
 * offset: the characters kept for every code point that ends at or before it.
 */
export const toCrengineOffset = (
  text: string,
  rawOffset: number,
  mode: TextMode,
) => {
  let offset = 0

  visitCodePoints(text, mode, (rawIndex, rawLength, units) => {
    if (rawIndex + rawLength > rawOffset) return false

    offset += units

    return true
  })

  return offset
}

/**
 * Raw UTF-16 offset of a crengine offset, or `undefined` when it is past the
 * end of crengine's text. Characters crengine dropped are skipped, so the
 * position lands right before the next character it kept; an offset inside
 * an expanded tab lands before the tab.
 */
export const toRawOffset = (
  text: string,
  crengineOffset: number,
  mode: TextMode,
): number | undefined => {
  if (crengineOffset < 0) return undefined

  let offset = 0
  let rawOffset: number | undefined

  visitCodePoints(text, mode, (rawIndex, _rawLength, units) => {
    if (units === 0) return true

    if (offset === crengineOffset || offset + units > crengineOffset) {
      rawOffset = rawIndex

      return false
    }

    offset += units

    return true
  })

  if (rawOffset !== undefined) return rawOffset

  return offset === crengineOffset ? text.length : undefined
}

/**
 * The pieces crengine's parser cuts a long text node into
 * (`LVXMLParser::ReadText`): once 8192 raw code points are buffered, the
 * buffer is emitted up to and including its last space (or its last lone
 * newline), and the rest starts the next piece. The rule is applied to the
 * decoded DOM text; crengine applies it to the source, so a long text with
 * entity references may split a few characters away.
 */
export const splitTextPieces = (text: string): TextPiece[] => {
  if (text.length < CRENGINE_TEXT_SPLIT_SIZE)
    return [{ start: 0, end: text.length }]

  const pieces: TextPiece[] = []
  let start = 0

  while (start < text.length) {
    let windowEnd = start
    let codePoints = 0

    while (windowEnd < text.length && codePoints < CRENGINE_TEXT_SPLIT_SIZE) {
      windowEnd += codePointLength(text.codePointAt(windowEnd) ?? 0)
      codePoints++
    }

    if (codePoints < CRENGINE_TEXT_SPLIT_SIZE) {
      pieces.push({ start, end: text.length })

      break
    }

    let end = windowEnd

    for (let index = windowEnd - 1; index >= start; index--) {
      const charCode = text.charCodeAt(index)

      if (charCode === SPACE) {
        end = index + 1

        break
      }

      if (charCode === CR || charCode === LF) {
        const next = index + 1 < windowEnd ? text.charCodeAt(index + 1) : 0

        if (
          (charCode === CR && next !== LF) ||
          (charCode === LF && next !== CR)
        ) {
          end = index + 1

          break
        }
      }
    }

    pieces.push({ start, end })
    start = end
  }

  return pieces
}
