import { createReader, type Manifest } from "@prose-reader/core"
import { audioEnhancer } from "@prose-reader/enhancer-audio"
import { NEVER } from "rxjs"

const trackIds = [`track-1`, `track-2`]

const manifest: Manifest = {
  filename: `audio-tracks`,
  title: `Audio tracks`,
  renditionLayout: `pre-paginated`,
  renditionSpread: `none`,
  readingDirection: `ltr`,
  spineItems: trackIds.map((id, index) => ({
    id,
    index,
    href: `${id}.mp3`,
    mediaType: `audio/mpeg`,
  })),
  items: trackIds.map((id) => ({
    id,
    href: `${id}.mp3`,
    mediaType: `audio/mpeg`,
  })),
}

const openingSpineItemId = new URLSearchParams(window.location.search).get(
  `spineItem`,
)

const reader = audioEnhancer(createReader)({
  manifest,
  target: openingSpineItemId
    ? { type: `spineItem`, value: openingSpineItemId }
    : undefined,
  pageTurnAnimation: `none`,
  layoutLayerTransition: false,
  // Which track is current does not depend on its source.
  getResource: () => NEVER,
})

// biome-ignore lint/style/noNonNullAssertion: TODO
reader.mount(document.getElementById(`app`)!)

// @ts-expect-error export for the spec
window.reader = reader
