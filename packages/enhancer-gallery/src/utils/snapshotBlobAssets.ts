type SnapshotObjectUrlStore = {
  add: (url: string) => void
  revokeAll: () => void
}

const RESOURCE_SELECTOR = [
  `img`,
  `video`,
  `audio`,
  `source`,
  `link`,
  `script`,
].join(`,`)

export const createSnapshotObjectUrlStore = (): SnapshotObjectUrlStore => {
  const objectUrls = new Set<string>()

  return {
    add: (url) => {
      objectUrls.add(url)
    },
    revokeAll: () => {
      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      objectUrls.clear()
    },
  }
}

const getElementAssetUrl = (element: Element) =>
  element.getAttribute(`src`) || element.getAttribute(`href`)

const setElementAssetUrl = (element: Element, url: string) => {
  if (element.hasAttribute(`src`)) {
    element.setAttribute(`src`, url)
  } else if (element.hasAttribute(`href`)) {
    element.setAttribute(`href`, url)
  }
}

const copyBlobUrl = async (
  url: string,
  document: Document,
  objectUrlStore: SnapshotObjectUrlStore,
) => {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = document.defaultView?.URL.createObjectURL(blob)

  if (!objectUrl) return

  objectUrlStore.add(objectUrl)

  return objectUrl
}

export const copyBlobAssetReferences = async (
  root: ParentNode,
  document: Document,
  objectUrlStore: SnapshotObjectUrlStore,
) => {
  const elementsWithAssets = Array.from(
    root.querySelectorAll(RESOURCE_SELECTOR),
  )

  await Promise.all(
    elementsWithAssets.map(async (element) => {
      const url = getElementAssetUrl(element)

      if (!url?.startsWith(`blob:`)) return

      let objectUrl: string | undefined

      try {
        objectUrl = await copyBlobUrl(url, document, objectUrlStore)
      } catch (error) {
        console.error(`Error copying snapshot blob asset:`, error)
        return
      }

      if (objectUrl) {
        setElementAssetUrl(element, objectUrl)
      }
    }),
  )
}
