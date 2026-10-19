import {
  getEpubCfiSpineItemref,
  updateEpubCfiSpineItemref,
} from "@prose-reader/cfi"
import type { Reader } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { createXmlSafeId } from "@prose-reader/shared"
import { parseVirtualPanoramaResourcePath } from "./panoramaSplitResource"

const VIRTUAL_SPINE_ID_EXTENSION = "vnd.prose-reader.cbz.virtual-spine-id"

type SpineItem = Manifest["spineItems"][number]

export type CbzEnhancerAPI = {
  __PROSE_READER_ENHANCER_CBZ: true
  cbz: {
    isPanoramaSpineItem: (spineItem: { item: { href: string } }) => boolean
  }
}

const decodeURIComponentSafe = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const decodeURISafe = (value: string) => {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

/**
 * A cbz panorama is a continuous double-page drawing that the streamer split
 * into two virtual portrait spine items. A spine item is therefore a panorama
 * half iff its href is one of those virtual split resources.
 */
const isPanoramaHalf = ({ href }: Pick<SpineItem, "href">) =>
  (parseVirtualPanoramaResourcePath(href) ??
    parseVirtualPanoramaResourcePath(decodeURISafe(href))) !== undefined

/**
 * The place of a record among the records the book shows, in reading order:
 * a panorama's spine index in the book before the streamer split it, since
 * both of its halves name its record.
 */
const getOriginalSpineIndex = (reader: Reader, containerUri: string) => {
  const containerUrisBefore = new Set<string>()

  for (const { item } of reader.spineItemsManager.items) {
    if (item.containerUri === containerUri) return containerUrisBefore.size

    containerUrisBefore.add(item.containerUri)
  }

  return undefined
}

const restoreOriginalSpineReference = (
  reader: Reader,
  cfi: string,
  spineItem: SpineItem,
) => {
  if (!isPanoramaHalf(spineItem)) return undefined

  const originalSpineIndex = getOriginalSpineIndex(
    reader,
    spineItem.containerUri,
  )

  if (originalSpineIndex === undefined) return undefined

  return updateEpubCfiSpineItemref(cfi, {
    extensions: {
      [VIRTUAL_SPINE_ID_EXTENSION]: encodeURIComponent(spineItem.id),
    },
    spineId: createXmlSafeId(spineItem.containerUri),
    spineIndex: originalSpineIndex,
  })
}

const restoreVirtualSpineReference = (reader: Reader, cfi: string) => {
  const virtualSpineId =
    getEpubCfiSpineItemref(cfi)?.extensions?.[VIRTUAL_SPINE_ID_EXTENSION]

  if (!virtualSpineId) return undefined

  const virtualSpineItem = reader.spineItemsManager.get(
    decodeURIComponentSafe(virtualSpineId),
  )

  if (!virtualSpineItem || !isPanoramaHalf(virtualSpineItem.item)) {
    return undefined
  }

  return updateEpubCfiSpineItemref(cfi, {
    extensions: {
      [VIRTUAL_SPINE_ID_EXTENSION]: undefined,
    },
    spineId: virtualSpineItem.item.id,
    spineIndex: virtualSpineItem.item.index,
  })
}

export const cbzEnhancer =
  <InheritOptions, InheritOutput extends Reader>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput & CbzEnhancerAPI => {
    const reader = next(options)

    const unregisterGenerateHook = reader.hookManager.register(
      "cfi.afterGenerate",
      ({ cfi, spineItem }) =>
        restoreOriginalSpineReference(reader, cfi, spineItem),
    )

    const unregisterResolveHook = reader.hookManager.register(
      "cfi.beforeResolve",
      ({ cfi }) => restoreVirtualSpineReference(reader, cfi),
    )

    const destroy = () => {
      unregisterGenerateHook()
      unregisterResolveHook()
      reader.destroy()
    }

    return {
      ...reader,
      __PROSE_READER_ENHANCER_CBZ: true,
      cbz: {
        isPanoramaSpineItem: (spineItem) => isPanoramaHalf(spineItem.item),
      },
      destroy,
    }
  }
