import {
  getEpubCfiSpineItemref,
  updateEpubCfiSpineItemref,
} from "@prose-reader/cfi"
import type { Reader } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { createXmlSafeId } from "@prose-reader/streamer"
import { parseVirtualPageSpreadResourcePath } from "./pageSpreadSplitResource"

const VIRTUAL_SPINE_ID_EXTENSION = "vnd.prose-reader.cbz.virtual-spine-id"

type SpineItem = Manifest["spineItems"][number]

export type CbzEnhancerAPI = {
  __PROSE_READER_ENHANCER_CBZ: true
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

const parseVirtualPageSpreadFromHref = (href: string) => {
  const virtualResource =
    parseVirtualPageSpreadResourcePath(href) ??
    parseVirtualPageSpreadResourcePath(decodeURISafe(href))

  if (!virtualResource) return undefined

  return {
    ...virtualResource,
    originalUri: decodeURIComponentSafe(virtualResource.originalUri),
  }
}

const getOriginalSpineIndex = (reader: Reader, originalUri: string) => {
  const seenVirtualOriginalUris = new Set<string>()
  let originalSpineIndex = 0

  for (const spineItem of reader.spineItemsManager.items) {
    const virtualResource = parseVirtualPageSpreadFromHref(spineItem.item.href)

    if (!virtualResource) {
      originalSpineIndex++
      continue
    }

    if (virtualResource.originalUri === originalUri) {
      return originalSpineIndex
    }

    if (!seenVirtualOriginalUris.has(virtualResource.originalUri)) {
      seenVirtualOriginalUris.add(virtualResource.originalUri)
      originalSpineIndex++
    }
  }

  return undefined
}

const restoreOriginalSpineReference = (
  reader: Reader,
  cfi: string,
  spineItem: SpineItem,
) => {
  const virtualResource = parseVirtualPageSpreadFromHref(spineItem.href)

  if (!virtualResource) return undefined

  const originalSpineIndex = getOriginalSpineIndex(
    reader,
    virtualResource.originalUri,
  )

  if (originalSpineIndex === undefined) return undefined

  return updateEpubCfiSpineItemref(cfi, {
    extensions: {
      [VIRTUAL_SPINE_ID_EXTENSION]: encodeURIComponent(spineItem.id),
    },
    spineId: createXmlSafeId(virtualResource.originalUri),
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

  if (
    !virtualSpineItem ||
    !parseVirtualPageSpreadFromHref(virtualSpineItem.item.href)
  ) {
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
      destroy,
    }
  }
