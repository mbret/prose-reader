import { resolve } from "@prose-reader/cfi"
import type { Manifest } from "@prose-reader/shared"
import type { PositionFormat } from "@prose-reader/shared/positions"
import type { CfiManager } from "../cfi"
import { PositionRegistry } from "./PositionRegistry"

export const createPositionRegistry = (manifest: Manifest, cfi: CfiManager) => {
  const cfiFormat: PositionFormat = {
    name: "cfi",
    spineItemIndexOf(value) {
      try {
        return value.startsWith("epubcfi(")
          ? cfi.parseCfi(value).itemIndex
          : undefined
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
  }
  const urlFormat: PositionFormat = {
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
  }
  return new PositionRegistry([cfiFormat, urlFormat])
}
