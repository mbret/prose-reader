import { describe, expect, it } from "vitest"
import { isAudioSpineItem } from "./utils"

describe(`isAudioSpineItem`, () => {
  it(`detects audio from media type`, () => {
    expect(
      isAudioSpineItem({
        href: `chapter.xhtml`,
        mediaType: `audio/mpeg`,
      }),
    ).toBe(true)
  })

  it(`falls back to common audio extensions`, () => {
    expect(
      isAudioSpineItem({
        href: `https://example.com/books/track-02.m4b?download=1`,
        mediaType: undefined,
      }),
    ).toBe(true)
  })

  it(`ignores non audio resources`, () => {
    expect(
      isAudioSpineItem({
        href: `chapter-03.xhtml`,
        mediaType: `application/xhtml+xml`,
      }),
    ).toBe(false)
  })
})
