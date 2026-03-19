import { describe, expect, it } from "vitest"
import { isAudioSpineItem } from "./utils"

describe(`isAudioSpineItem`, () => {
  it(`detects audio from media type`, () => {
    expect(
      isAudioSpineItem({
        id: `track-1`,
        href: `chapter.xhtml`,
        index: 0,
        mediaType: `audio/mpeg`,
      }),
    ).toBe(true)
  })

  it(`falls back to common audio extensions`, () => {
    expect(
      isAudioSpineItem({
        id: `track-2`,
        href: `https://example.com/books/track-02.m4b?download=1`,
        index: 1,
        mediaType: undefined,
      }),
    ).toBe(true)
  })

  it(`ignores non audio resources`, () => {
    expect(
      isAudioSpineItem({
        id: `track-3`,
        href: `chapter-03.xhtml`,
        index: 2,
        mediaType: `application/xhtml+xml`,
      }),
    ).toBe(false)
  })
})
