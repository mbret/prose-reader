import type { Manifest } from "@prose-reader/core"

const AUDIO_EXTENSIONS = new Set([
  `mp3`,
  `m4a`,
  `m4b`,
  `aac`,
  `ogg`,
  `oga`,
  `wav`,
  `flac`,
  `opus`,
])

const getExtensionFromHref = (href: string) => {
  const [pathname = ``] = href.split(/[?#]/)
  const segments = pathname.split(`/`)
  const basename = segments.at(-1) ?? ``
  const extension = basename.split(`.`).at(-1)

  return extension?.toLowerCase()
}

export const isAudioSpineItem = (item: Manifest["spineItems"][number]) => {
  const mediaType = item.mediaType?.split(`;`).at(0)?.trim().toLowerCase()

  if (mediaType?.startsWith(`audio/`)) {
    return true
  }

  const extension = getExtensionFromHref(item.href)

  return extension ? AUDIO_EXTENSIONS.has(extension) : false
}
