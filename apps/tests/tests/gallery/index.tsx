import { createReader } from "@prose-reader/core"
import { galleryEnhancer } from "@prose-reader/enhancer-gallery"
import type { Subscription } from "rxjs"
import { openFixtureBook } from "../fixtureBook"

const getElementById = (id: string) => {
  const element = document.getElementById(id)

  if (!element) {
    throw new Error(`Missing element #${id}`)
  }

  return element
}

async function run() {
  const book = await openFixtureBook("sample.cbz")
  const createReaderWithEnhancers = galleryEnhancer(createReader)
  const reader = createReaderWithEnhancers({
    ...book,
    numberOfAdjacentSpineItemToPreLoad: 0,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
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

  reader.mount(getElementById(`app`))

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
