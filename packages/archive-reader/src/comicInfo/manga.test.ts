import { describe, expect, it } from "vitest"
import { COMIC_INFO_MANGA_VALUES, isComicInfoManga } from "./manga"

describe("isComicInfoManga", () => {
  it.each(COMIC_INFO_MANGA_VALUES)("accepts schema value %s", (value) => {
    expect(isComicInfoManga(value)).toBe(true)
  })

  it("rejects arbitrary producer strings", () => {
    expect(isComicInfoManga("maybe")).toBe(false)
    expect(isComicInfoManga("")).toBe(false)
  })
})
