import { createReader, type Manifest } from "@prose-reader/core"
import { audioEnhancer } from "@prose-reader/enhancer-audio"
import { from } from "rxjs"

const playRejectionNames: string[] = []
const nativePlay = HTMLMediaElement.prototype.play

HTMLMediaElement.prototype.play = function recordPlayRejection() {
  const playRequest = nativePlay.call(this)

  playRequest.catch((error: unknown) => {
    playRejectionNames.push(error instanceof Error ? error.name : String(error))
  })

  return playRequest
}

let releaseTrackResource = () => {}
const trackResourceReleased = new Promise<void>((resolve) => {
  releaseTrackResource = resolve
})

const manifest: Manifest = {
  filename: `undecodable-audio`,
  title: `Undecodable audio`,
  renditionLayout: `pre-paginated`,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  spineItems: [
    {
      id: `track`,
      index: 0,
      href: `track.mp3`,
      mediaType: `audio/mpeg`,
    },
  ],
  items: [
    {
      id: `track`,
      href: `track.mp3`,
      mediaType: `audio/mpeg`,
    },
  ],
}

const reader = audioEnhancer(createReader)({
  manifest,
  pageTurnAnimation: `none`,
  layoutLayerTransition: false,
  getResource: () =>
    from(
      trackResourceReleased.then(
        () =>
          new Response(new Uint8Array([0, 1, 2, 3]), {
            headers: { "Content-Type": `audio/mpeg` },
          }),
      ),
    ),
})

// biome-ignore lint/style/noNonNullAssertion: TODO
reader.mount(document.getElementById(`app`)!)

document.getElementById(`play`)?.addEventListener(`click`, () => {
  reader.audio.play()
})

// @ts-expect-error export for the spec
window.reader = reader
// @ts-expect-error export for the spec
window.releaseTrackResource = releaseTrackResource
// @ts-expect-error export for the spec
window.playRejectionNames = playRejectionNames
