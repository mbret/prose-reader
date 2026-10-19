import { describe, expect, it } from "vitest"
import { getKoreaderProgressKind } from "./progress"

describe("getKoreaderProgressKind", () => {
  it.each([
    "application/epub+zip",
    "application/epub",
    "Application/EPUB+zip; charset=binary",
  ])("an xpointer for %s, which crengine opens", (mediaType) => {
    expect(getKoreaderProgressKind(mediaType)).toBe("xpointer")
  })

  it.each([
    "application/pdf",
    "application/vnd.comicbook+zip",
    "application/x-cbz",
    "application/vnd.comicbook-rar",
    "application/vnd.rar",
    "application/x-cbr",
    "application/vnd.comicbook+tar",
    "application/x-cbt",
  ])("a page for %s, which MuPDF opens", (mediaType) => {
    expect(getKoreaderProgressKind(mediaType)).toBe("page")
  })

  it.each([
    ["text, whose crengine document prose does not reproduce", "text/plain"],
    [
      "a plain ZIP, which KOReader opens with the engine its first file calls for",
      "application/zip",
    ],
    ["a 7z comic, which KOReader does not open", "application/x-cb7"],
    ["an image", "image/jpeg"],
    ["data of an unknown type", "application/octet-stream"],
  ])("nothing for %s", (_, mediaType) => {
    expect(getKoreaderProgressKind(mediaType)).toBeUndefined()
  })
})
