import type { ParsedXPointer, XPointerStep } from "./types"

/**
 * Wrapper elements crengine inserts into its own DOM for layout
 * (crengine/include/fb2def.h, `EL_BOXING_START`..`EL_BOXING_END`) plus the
 * `pseudoElem` it creates for `::before` / `::after`. None exists in the source
 * XHTML, so a pointer naming one cannot be resolved in a browser DOM.
 */
export const XPOINTER_BOXING_ELEMENT_NAMES: readonly string[] = [
  "autoBoxing",
  "tabularBox",
  "rubyBox",
  "mathBox",
  "floatBox",
  "inlineBox",
  "pseudoElem",
]

const boxingElementNames = new Set<string>(
  XPOINTER_BOXING_ELEMENT_NAMES.map((name) => name.toLowerCase()),
)

const isDigit = (charCode: number) => charCode >= 48 && charCode <= 57

/** An element name as crengine's XML parser can produce one (no `.`, which ends a step). */
const ELEMENT_NAME = /^[A-Za-z_][A-Za-z0-9_:-]*$/

const isStepBoundary = (char: string | undefined) =>
  char === undefined || char === "/" || char === "."

const readDigits = (input: string, from: number) => {
  let end = from

  while (end < input.length && isDigit(input.charCodeAt(end))) end++

  return end
}

/**
 * Port of `ParseXPathStep` (crengine/src/lvtinydom.cpp): a pointer is a
 * sequence of `/name`, `/name[N]`, `/text()`, `/text()[N]` or `/N` steps, with
 * an optional `.N` point that must end the string (`createXPointerV2` rejects
 * anything after it).
 *
 * Stricter than crengine on malformed input: `[N]` must be plain decimal
 * digits, where crengine's `atoi` would also take signs, hex or surrounding
 * blanks and silently turn garbage into an unresolvable index 0, and a step
 * name must be a plausible element name, where crengine would look up any
 * text (`text()x`, `p q`) and fail to find an element.
 */
const tokenize = (
  input: string,
): { steps: XPointerStep[]; point: number | undefined } | undefined => {
  const steps: XPointerStep[] = []
  let position = 0

  while (position < input.length) {
    const prefix = input[position]

    if (prefix === ".") {
      const digitsStart = position + 1
      const digitsEnd = readDigits(input, digitsStart)

      if (digitsEnd === digitsStart || digitsEnd !== input.length)
        return undefined

      return { steps, point: Number(input.slice(digitsStart, digitsEnd)) }
    }

    if (prefix !== "/") return undefined

    const stepStart = position + 1

    if (isDigit(input.charCodeAt(stepStart))) {
      const digitsEnd = readDigits(input, stepStart)

      if (!isStepBoundary(input[digitsEnd])) return undefined

      const index = Number(input.slice(stepStart, digitsEnd))

      if (index < 1) return undefined

      steps.push({ kind: "nodeIndex", index })
      position = digitsEnd

      continue
    }

    let nameEnd = stepStart

    while (nameEnd < input.length && !"[/.".includes(input[nameEnd] ?? ""))
      nameEnd++

    if (nameEnd === stepStart) return undefined

    const name = input.slice(stepStart, nameEnd)
    let index: number | undefined
    let stepEnd = nameEnd

    if (input[nameEnd] === "[") {
      const closing = input.indexOf("]", nameEnd + 1)

      if (closing === -1) return undefined

      const digits = input.slice(nameEnd + 1, closing)

      if (digits.length === 0 || readDigits(digits, 0) !== digits.length)
        return undefined

      index = Number(digits)

      if (index < 1) return undefined

      stepEnd = closing + 1
    }

    if (!isStepBoundary(input[stepEnd])) return undefined

    if (name === "text()") {
      steps.push({ kind: "text", index })
    } else if (ELEMENT_NAME.test(name)) {
      steps.push({ kind: "element", name, index })
    } else {
      return undefined
    }
    position = stepEnd
  }

  return { steps, point: undefined }
}

const isElementNamed = (
  step: XPointerStep | undefined,
  name: string,
): step is Extract<XPointerStep, { kind: "element" }> =>
  step?.kind === "element" && step.name.toLowerCase() === name

/**
 * Accepts every shape crengine has emitted (`toStringV1`, `toStringV2` and
 * its explicit-index variant for DOM versions >= 20260812) plus the bare
 * `/body/DocFragment[N]` third parties write for the start of a spine item.
 *
 * Returns `undefined` for anything crengine's own parser would reject or that
 * does not start with the `/body/DocFragment[N]/body` prefix of an EPUB
 * pointer. crengine's `#id` form is rejected too: it names an element of the
 * whole book DOM by id, which a spine item document cannot answer.
 */
export const parseXPointer = (input: string): ParsedXPointer | undefined => {
  const tokenized = tokenize(input)

  if (!tokenized) return undefined

  const [root, fragment, body, ...steps] = tokenized.steps

  if (!isElementNamed(root, "body") || (root.index ?? 1) !== 1) return undefined

  if (!isElementNamed(fragment, "docfragment")) return undefined

  const spineItemIndex = (fragment.index ?? 1) - 1

  // `/body/DocFragment[N]` alone, with or without a point (Kavita emits
  // `/body/DocFragment[N].0`): the start of the spine item.
  if (body === undefined) {
    return {
      spineItemIndex,
      steps: [],
      point: undefined,
      containsBoxingElements: false,
    }
  }

  if (!isElementNamed(body, "body") || (body.index ?? 1) !== 1) return undefined

  return {
    spineItemIndex,
    steps,
    point: tokenized.point,
    containsBoxingElements: steps.some(
      (step) =>
        step.kind === "element" &&
        boxingElementNames.has(step.name.toLowerCase()),
    ),
  }
}
