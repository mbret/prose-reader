import { describe, expect, it } from "vitest"
import {
  getEpubCfiSpineItemref,
  updateEpubCfiSpineItemref,
} from "./spineItemref"

describe("spine itemref helpers", () => {
  it("reads the spine itemref step from a CFI", () => {
    expect(
      getEpubCfiSpineItemref(
        "epubcfi(/6/4[chap01ref;vnd.example=value]!/2[body])",
      ),
    ).toEqual({
      extensions: {
        "vnd.example": "value",
      },
      spineId: "chap01ref",
      spineIndex: 1,
    })
  })

  it("updates the spine itemref step and merges extensions", () => {
    expect(
      updateEpubCfiSpineItemref(
        "epubcfi(/6/6[virtual-item]!/2[body]/2[para])",
        {
          extensions: {
            "vnd.prose-reader.cbz.virtual-spine-id": "virtual-item",
          },
          spineId: "images/page 002-003.jpg",
          spineIndex: 1,
        },
      ),
    ).toBe(
      "epubcfi(/6/4[images/page 002-003.jpg;vnd.prose-reader.cbz.virtual-spine-id=virtual-item]!/2[body]/2[para])",
    )
  })

  it("removes extensions from the spine itemref step", () => {
    expect(
      updateEpubCfiSpineItemref(
        "epubcfi(/6/4[images/page 002-003.jpg;vnd.keep=value;vnd.remove=value]!/2[body])",
        {
          extensions: {
            "vnd.remove": undefined,
          },
        },
      ),
    ).toBe("epubcfi(/6/4[images/page 002-003.jpg;vnd.keep=value]!/2[body])")
  })

  it("round-trips a spaceful spine id through update and read", () => {
    const cfi = updateEpubCfiSpineItemref(
      "epubcfi(/6/6[virtual-item]!/2[body]/2[para])",
      {
        extensions: {
          "vnd.prose-reader.cbz.virtual-spine-id": "virtual-item",
        },
        spineId: "images/page 002-003.jpg",
        spineIndex: 1,
      },
    )

    expect(cfi).toBeDefined()
    if (!cfi) return

    expect(getEpubCfiSpineItemref(cfi)).toEqual({
      extensions: {
        "vnd.prose-reader.cbz.virtual-spine-id": "virtual-item",
      },
      spineId: "images/page 002-003.jpg",
      spineIndex: 1,
    })
  })

  it("reads a spaceful spine id even when the parser falls back to text", () => {
    expect(
      getEpubCfiSpineItemref("epubcfi(/6/4[images/page 002-003.jpg]!/2[body])"),
    ).toEqual({
      extensions: undefined,
      spineId: "images/page 002-003.jpg",
      spineIndex: 1,
    })
  })
})
