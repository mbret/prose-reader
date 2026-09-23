import { resolve } from "@prose-reader/cfi"
import type { Manifest } from "@prose-reader/shared"
import type { PositionFormat } from "@prose-reader/shared/positions"
import type { CfiManager } from "../cfi"
import { PositionRegistry } from "./PositionRegistry"

/**
 * The canonical format. It goes through the cfi manager, so the generation and
 * resolution hooks (a virtual spine, for example) apply to it like to any
 * other cfi.
 */
const createCfiFormat = (cfi: CfiManager): PositionFormat => ({
  name: "cfi",

  spineItemIndexOf(value) {
    if (!value.startsWith("epubcfi(")) return undefined

    try {
      return cfi.parseCfi(value).itemIndex
    } catch {
      return undefined
    }
  },

  resolve(value, { document }) {
    const transformed = cfi.transformForResolve(value)

    if (cfi.isRootCfi(transformed)) return undefined

    const result = resolve(transformed, document)
    const node = result.isRange ? result.node?.startContainer : result.node

    if (!node) return undefined

    return {
      node,
      offset: Array.isArray(result.offset)
        ? result.offset.at(-1)
        : result.offset,
    }
  },

  generate: (position, { spineItem }) =>
    cfi.generateCfiFromDomPosition(position, spineItem),
})

/**
 * An absolute spine item url, optionally with the id of an element as its
 * fragment. It only reads positions: a page start has no url of its own.
 */
const createUrlFormat = (manifest: Manifest): PositionFormat => ({
  name: "url",

  spineItemIndexOf(value) {
    try {
      const url = new URL(value)

      return manifest.spineItems.find(
        (item) => item.href === `${url.origin}${url.pathname}`,
      )?.index
    } catch {
      return undefined
    }
  },

  resolve(value, { document }) {
    const hash = new URL(value).hash.slice(1)

    if (!hash) return undefined

    let decoded = hash

    try {
      decoded = decodeURIComponent(hash)
    } catch {
      /* A literal percent can be part of an element ID. */
    }

    const node =
      document.getElementById(hash) ?? document.getElementById(decoded)

    return node ? { node } : undefined
  },

  generate: () => undefined,
})

export const createPositionRegistry = (manifest: Manifest, cfi: CfiManager) =>
  new PositionRegistry([createCfiFormat(cfi), createUrlFormat(manifest)])
