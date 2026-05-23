import { describe, expect, it } from "vitest"
import { renderPrePaginated } from "./renderPrePaginated"

const createFrame = ({
  viewportHeight = 100,
  viewportWidth = 100,
}: {
  viewportHeight?: number
  viewportWidth?: number
} = {}) => {
  const frameElement = document.createElement("iframe")

  document.body.appendChild(frameElement)
  frameElement.contentDocument?.open()
  frameElement.contentDocument?.write(
    `<html><head><meta name="viewport" content="width=${viewportWidth},height=${viewportHeight}"></head><body></body></html>`,
  )
  frameElement.contentDocument?.close()

  return frameElement
}

describe("renderPrePaginated", () => {
  it("honors a blank-before RTL item that initially lands in the left slot", () => {
    const frameElement = createFrame({ viewportWidth: 50 })

    try {
      expect(
        renderPrePaginated({
          blankPagePosition: "before",
          frameElement,
          isRTL: true,
          minPageSpread: 2,
          pageHeight: 100,
          pageWidth: 100,
          spreadPosition: "left",
        }),
      ).toEqual({ width: 200, height: 100 })
      expect(frameElement.style.getPropertyValue("left")).toBe("0px")
      expect(frameElement.style.getPropertyValue("right")).toBe("")
      expect(frameElement.style.getPropertyValue("transform-origin")).toBe(
        "left center",
      )
    } finally {
      frameElement.remove()
    }
  })

  it("honors a blank-before LTR item that initially lands in the left slot", () => {
    const frameElement = createFrame({ viewportWidth: 50 })

    try {
      renderPrePaginated({
        blankPagePosition: "before",
        frameElement,
        isRTL: false,
        minPageSpread: 2,
        pageHeight: 100,
        pageWidth: 100,
        spreadPosition: "left",
      })

      expect(frameElement.style.getPropertyValue("left")).toBe("50%")
      expect(frameElement.style.getPropertyValue("right")).toBe("")
      expect(frameElement.style.getPropertyValue("transform-origin")).toBe(
        "left center",
      )
    } finally {
      frameElement.remove()
    }
  })

  it("honors a blank-before RTL item that initially lands in the right slot", () => {
    const frameElement = createFrame({ viewportWidth: 50 })

    try {
      expect(
        renderPrePaginated({
          blankPagePosition: "before",
          frameElement,
          isRTL: true,
          minPageSpread: 2,
          pageHeight: 100,
          pageWidth: 100,
          spreadPosition: "right",
        }),
      ).toEqual({ width: 200, height: 100 })
      expect(frameElement.style.getPropertyValue("right")).toBe("50%")
      expect(frameElement.style.getPropertyValue("left")).toBe("")
      expect(frameElement.style.getPropertyValue("transform-origin")).toBe(
        "right center",
      )
    } finally {
      frameElement.remove()
    }
  })

  it("honors a blank-before LTR item that initially lands in the right slot", () => {
    const frameElement = createFrame({ viewportWidth: 50 })

    try {
      renderPrePaginated({
        blankPagePosition: "before",
        frameElement,
        isRTL: false,
        minPageSpread: 2,
        pageHeight: 100,
        pageWidth: 100,
        spreadPosition: "right",
      })

      expect(frameElement.style.getPropertyValue("right")).toBe("0px")
      expect(frameElement.style.getPropertyValue("left")).toBe("")
      expect(frameElement.style.getPropertyValue("transform-origin")).toBe(
        "right center",
      )
    } finally {
      frameElement.remove()
    }
  })
})
