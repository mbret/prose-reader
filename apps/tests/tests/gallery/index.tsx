import { createReader } from "@prose-reader/core"
import { galleryEnhancer } from "@prose-reader/enhancer-gallery"
import { createArchiveFromJszip, Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import type { Subscription } from "rxjs"
import { from } from "rxjs"

async function createStreamer() {
  const streamer = new Streamer({
    getArchive: async () => {
      const comicResponse = await fetch(
        "http://localhost:3333/epubs/sample.cbz",
      )
      const comicBlob = await comicResponse.blob()
      const comicJszip = await loadAsync(comicBlob)

      return createArchiveFromJszip(comicJszip)
    },
  })

  return streamer
}

const getElementById = (id: string) => {
  const element = document.getElementById(id)

  if (!element) {
    throw new Error(`Missing element #${id}`)
  }

  return element
}

async function run() {
  const streamer = await createStreamer()
  const manifestResponse = await streamer.fetchManifest({
    key: `_`,
  })
  const manifest = await manifestResponse.json()
  const createReaderWithEnhancers = galleryEnhancer(createReader)
  const reader = createReaderWithEnhancers({
    numberOfAdjacentSpineItemToPreLoad: 0,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })
  const galleryElement = getElementById(`gallery`)
  const galleryGridElement = getElementById(`gallery-grid`)
  const gallerySubscriptions: Subscription[] = []

  const cleanupGallery = () => {
    gallerySubscriptions.splice(0).forEach((subscription) => {
      subscription.unsubscribe()
    })
    galleryGridElement.innerHTML = ``
  }

  getElementById(`open-gallery`).addEventListener(`click`, () => {
    cleanupGallery()
    galleryElement.hidden = false

    reader.spineItemsManager.items.slice(0, 6).forEach((item) => {
      const cellElement = document.createElement(`div`)

      cellElement.dataset.galleryCell = item.item.id
      galleryGridElement.appendChild(cellElement)

      const subscription = reader.gallery
        .snapshot(item, cellElement, {
          height: cellElement.clientHeight,
          width: cellElement.clientWidth,
        })
        .subscribe()

      gallerySubscriptions.push(subscription)
    })
  })

  reader.load({
    containerElement: getElementById(`app`),
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
