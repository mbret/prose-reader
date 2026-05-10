import { describe, expect, it } from "vitest"
import { escapeXmlAttributeValue } from "./xml"

describe("escapeXmlAttributeValue", () => {
  it("should escape characters that are special in XML attributes", () => {
    expect(escapeXmlAttributeValue(`cover & "quote" 'apos' <tag>.jpg`)).toBe(
      `cover &amp; &quot;quote&quot; &apos;apos&apos; &lt;tag&gt;.jpg`,
    )
  })
})
