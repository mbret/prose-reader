import { getEpubCfiSpineItemref } from "@prose-reader/cfi"
import type { Reader } from "@prose-reader/core"
import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it, vi } from "vitest"
import { cbzEnhancer } from "./enhancer"
import { buildVirtualPageSpreadResourcePath } from "./pageSpreadSplitManifest"

const VIRTUAL_SPINE_ID_EXTENSION = "vnd.prose-reader.cbz.virtual-spine-id"

type SpineItem = Manifest["spineItems"][number]
type CfiGenerateHook = (params: {
  cfi: string
  spineItem: SpineItem
}) => string | undefined
type CfiResolveHook = (params: { cfi: string }) => string | undefined

const createSpineItem = ({
  href,
  id,
  index,
}: Pick<SpineItem, "href" | "id" | "index">): SpineItem => ({
  href,
  id,
  index,
})

const createVirtualSpineItem = ({
  cropSide,
  id,
  index,
  originalUri,
}: {
  cropSide: "left" | "right"
  id: string
  index: number
  originalUri: string
}) =>
  createSpineItem({
    href: encodeURI(
      `file://${buildVirtualPageSpreadResourcePath({
        cropSide,
        originalUri,
      })}`,
    ),
    id,
    index,
  })

const createReader = (items: SpineItem[]) => {
  const generateHooks: CfiGenerateHook[] = []
  const resolveHooks: CfiResolveHook[] = []
  const runtimeItems = items.map((item) => ({ item }))

  function registerCfiHook(
    ...args: ["cfi.afterGenerate", CfiGenerateHook]
  ): () => void
  function registerCfiHook(
    ...args: ["cfi.beforeResolve", CfiResolveHook]
  ): () => void
  function registerCfiHook(
    ...args:
      | ["cfi.afterGenerate", CfiGenerateHook]
      | ["cfi.beforeResolve", CfiResolveHook]
  ) {
    const [name, hook] = args

    if (name === "cfi.afterGenerate") {
      generateHooks.push(hook)

      return () => {
        const hookIndex = generateHooks.indexOf(hook)

        if (hookIndex >= 0) {
          generateHooks.splice(hookIndex, 1)
        }
      }
    }

    resolveHooks.push(hook)

    return () => {
      const hookIndex = resolveHooks.indexOf(hook)

      if (hookIndex >= 0) {
        resolveHooks.splice(hookIndex, 1)
      }
    }
  }

  const reader = {
    hookManager: {
      register: registerCfiHook,
    },
    destroy: vi.fn(),
    spineItemsManager: {
      get: (indexOrId: number | string | undefined) => {
        if (typeof indexOrId === "number") return runtimeItems[indexOrId]
        if (typeof indexOrId === "string") {
          return runtimeItems.find(({ item }) => item.id === indexOrId)
        }

        return undefined
      },
      items: runtimeItems,
    },
  }

  cbzEnhancer(() => {
    // This unit only exercises the reader members consumed by cbzEnhancer.
    return reader as unknown as Reader
  })({})

  return {
    generateHook: generateHooks[0],
    reader,
    resolveHook: resolveHooks[0],
  }
}

describe("cbzEnhancer", () => {
  it("rewrites generated virtual spread CFIs to the original CBZ resource", () => {
    const firstSpreadUri = "p002-003.jpg"
    const secondSpreadUri = "bonus/p006-007.jpg"
    const firstSpreadLeft = createVirtualSpineItem({
      cropSide: "left",
      id: "p002-003.jpg.002",
      index: 0,
      originalUri: firstSpreadUri,
    })
    const firstSpreadRight = createVirtualSpineItem({
      cropSide: "right",
      id: "p002-003.jpg.003",
      index: 1,
      originalUri: firstSpreadUri,
    })
    const secondSpreadLeft = createVirtualSpineItem({
      cropSide: "left",
      id: "bonus/p006-007.jpg.006",
      index: 2,
      originalUri: secondSpreadUri,
    })
    const secondSpreadRight = createVirtualSpineItem({
      cropSide: "right",
      id: "bonus/p006-007.jpg.007",
      index: 3,
      originalUri: secondSpreadUri,
    })
    const { generateHook } = createReader([
      firstSpreadLeft,
      firstSpreadRight,
      secondSpreadLeft,
      secondSpreadRight,
    ])

    expect(generateHook).toBeDefined()
    if (!generateHook) return

    const cfi = generateHook({
      cfi: "epubcfi(/6/6[bonus/p006-007.jpg.006]!/2[body])",
      spineItem: secondSpreadLeft,
    })

    expect(cfi).toBeDefined()
    if (!cfi) return

    const spineItemref = getEpubCfiSpineItemref(cfi)

    expect(spineItemref?.spineIndex).toBe(1)
    expect(spineItemref?.spineId).toBe(secondSpreadUri)
    expect(
      decodeURIComponent(
        spineItemref?.extensions?.[VIRTUAL_SPINE_ID_EXTENSION] ?? "",
      ),
    ).toBe(secondSpreadLeft.id)
  })

  it("round-trips spread CFIs whose original resource path contains spaces", () => {
    const originalUri = "images/page 002-003.jpg"
    const spreadLeft = createVirtualSpineItem({
      cropSide: "left",
      id: "images/page 002-003.jpg.002",
      index: 0,
      originalUri,
    })
    const spreadRight = createVirtualSpineItem({
      cropSide: "right",
      id: "images/page 002-003.jpg.003",
      index: 1,
      originalUri,
    })
    const { generateHook, resolveHook } = createReader([
      spreadLeft,
      spreadRight,
    ])

    expect(generateHook).toBeDefined()
    expect(resolveHook).toBeDefined()
    if (!generateHook || !resolveHook) return

    const externalCfi = generateHook({
      cfi: "epubcfi(/6/2[images/page 002-003.jpg.002]!/2[body])",
      spineItem: spreadLeft,
    })

    expect(externalCfi).toBeDefined()
    if (!externalCfi) return

    const externalItemref = getEpubCfiSpineItemref(externalCfi)

    expect(externalItemref?.spineIndex).toBe(0)
    expect(externalItemref?.spineId).toBe(originalUri)

    const internalCfi = resolveHook({ cfi: externalCfi })

    expect(internalCfi).toBeDefined()
    if (!internalCfi) return

    const internalItemref = getEpubCfiSpineItemref(internalCfi)

    expect(internalItemref?.spineIndex).toBe(0)
    expect(internalItemref?.spineId).toBe(spreadLeft.id)
  })

  it("rewrites incoming original-resource CFIs back to the virtual spread item", () => {
    const originalUri = "bonus/p006-007.jpg"
    const spreadLeft = createVirtualSpineItem({
      cropSide: "left",
      id: "bonus/p006-007.jpg.006",
      index: 2,
      originalUri,
    })
    const spreadRight = createVirtualSpineItem({
      cropSide: "right",
      id: "bonus/p006-007.jpg.007",
      index: 3,
      originalUri,
    })
    const { generateHook, resolveHook } = createReader([
      createSpineItem({
        href: "file://cover.jpg",
        id: "cover.jpg",
        index: 0,
      }),
      spreadLeft,
      spreadRight,
    ])

    expect(generateHook).toBeDefined()
    expect(resolveHook).toBeDefined()
    if (!generateHook || !resolveHook) return

    const externalCfi = generateHook({
      cfi: "epubcfi(/6/4[bonus/p006-007.jpg.006]!/2[body])",
      spineItem: spreadLeft,
    })

    expect(externalCfi).toBeDefined()
    if (!externalCfi) return

    const internalCfi = resolveHook({ cfi: externalCfi })

    expect(internalCfi).toBeDefined()
    if (!internalCfi) return

    const spineItemref = getEpubCfiSpineItemref(internalCfi)

    expect(spineItemref?.spineIndex).toBe(2)
    expect(spineItemref?.spineId).toBe(spreadLeft.id)
    expect(spineItemref?.extensions?.[VIRTUAL_SPINE_ID_EXTENSION]).toBe(
      undefined,
    )
  })
})
