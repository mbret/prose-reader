import { EPUB_CFI_PACKAGE_SPINE_STEP_INDEX } from "./constants"
import type { CfiPart, ParsedCfi } from "./parse"
import { parse } from "./parse"
import { serialize } from "./serialize"
import { isParsedCfiRange } from "./utils"

export type EpubCfiSpineItemref = {
  spineIndex: number
  spineId?: string
  extensions?: Record<string, string>
}

export type EpubCfiSpineItemrefUpdate = {
  spineIndex?: number
  spineId?: string
  extensions?: Record<string, string | undefined>
}

export const spineIndexToEpubCfiItemrefStepIndex = (spineIndex: number) =>
  (spineIndex + 1) * 2

export const epubCfiItemrefStepIndexToSpineIndex = (stepIndex: number) =>
  stepIndex / 2 - 1

const getFirstPackageDocumentPath = (parsed: ParsedCfi) => {
  return isParsedCfiRange(parsed) ? parsed.parent[0] : parsed[0]
}

const getSpineItemrefPart = (parsed: ParsedCfi): CfiPart | undefined => {
  const path = getFirstPackageDocumentPath(parsed)

  if (path?.[0]?.index !== EPUB_CFI_PACKAGE_SPINE_STEP_INDEX) return undefined

  return path[1]
}

const mergeExtensions = (
  currentExtensions: Record<string, string> | undefined,
  extensionUpdates: Record<string, string | undefined>,
) => {
  const nextExtensions = { ...currentExtensions }

  for (const [name, value] of Object.entries(extensionUpdates)) {
    if (value === undefined) {
      delete nextExtensions[name]
    } else {
      nextExtensions[name] = value
    }
  }

  return Object.keys(nextExtensions).length > 0 ? nextExtensions : undefined
}

/**
 * Per the EPUB CFI 1.1 spec, the bracket assertion attached to the spine
 * itemref step is unambiguously an `id_assertion` (the IDREF of the
 * `<itemref>` element) — `text_assertion`s only appear at leaf/character
 * steps. The shared CFI parser however uses heuristics (no spaces, short
 * length) to disambiguate id vs text assertions, so a spineId that
 * contains spaces or is long can end up classified as `text`. At this
 * position-known step we recover the intended id from the text fallback.
 */
const readSpineIdFromPart = (part: CfiPart): string | undefined => {
  if (part.id !== undefined) return part.id

  if (!part.text || part.text.length === 0) return undefined

  return part.text.join(",")
}

export const getEpubCfiSpineItemref = (
  cfi: string,
): EpubCfiSpineItemref | undefined => {
  try {
    const spineItemPart = getSpineItemrefPart(parse(cfi))

    if (!spineItemPart) return undefined

    return {
      spineIndex: epubCfiItemrefStepIndexToSpineIndex(spineItemPart.index),
      spineId: readSpineIdFromPart(spineItemPart),
      extensions: spineItemPart.extensions,
    }
  } catch {
    return undefined
  }
}

export const updateEpubCfiSpineItemref = (
  cfi: string,
  update: EpubCfiSpineItemrefUpdate,
) => {
  try {
    const parsed = parse(cfi)
    const spineItemPart = getSpineItemrefPart(parsed)

    if (!spineItemPart) return undefined

    if (update.spineIndex !== undefined) {
      spineItemPart.index = spineIndexToEpubCfiItemrefStepIndex(
        update.spineIndex,
      )
    }

    if (update.spineId !== undefined) {
      spineItemPart.id = update.spineId
      spineItemPart.text = undefined
      spineItemPart.side = undefined
    }

    if (update.extensions !== undefined) {
      spineItemPart.extensions = mergeExtensions(
        spineItemPart.extensions,
        update.extensions,
      )
    }

    return serialize(parsed)
  } catch {
    return undefined
  }
}
