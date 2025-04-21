import { generate } from "./generate"
import { describe, it, expect } from "vitest"
// @ts-ignore
import EpubCfiResolver from "epub-cfi-resolver"
import { fromElements } from "./foliate"

describe("given a xhtml document", () => {
  it("should generate a cfi for img tag", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <title>…</title>
        </head>
    
            <body id="body01">
                <p>…</p>
                <p>…</p>
                <p>…</p>
                <p>…</p>
                <p id="para05">xxx<em>yyy</em>0123456789</p>
                <p>…</p>
                <p>…</p>
                <img id="svgimg" src="foo.svg" alt="…"/>
                <p>…</p>
                <p>…</p>
            </body>
        </html>`,
      "application/xhtml+xml",
    )

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const imageNode = doc.getElementById("svgimg")!

    const cfi = generate(imageNode)

    const resolved = EpubCfiResolver.generate(imageNode)
    const foliate = fromElements([imageNode])

    console.log({ resolved, cfi, foliate })

    // expect(resolved).toEqual("epubcfi(/4[body01]/16[svgimg])")
    expect(cfi).toEqual("epubcfi(/4[body01]/16[svgimg])")

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const para05Node = doc.getElementById("para05")!
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const para5NodeEm = para05Node.children[0]!

    expect(generate(para5NodeEm)).toEqual("epubcfi(/4[body01]/10[para05]/2)")
  })
})
