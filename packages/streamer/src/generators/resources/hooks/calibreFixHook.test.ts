import { describe, expect, it } from "vitest"
import { Archive } from "../../../archives/types"
import { calibreFixHook } from "./calibreFixHook"

describe("Given a book from calibre", () => {
  it("should fix the responsive broken cover", async () => {
    const archive: Archive = {
      filename: "",
      files: [
        {
          base64: () => Promise.resolve(""),
          blob: () => Promise.resolve(new Blob([])),
          string: () =>
            Promise.resolve(`<html>
  <head>
    <meta name="calibre:cover" content="true" />
  </head>
  <body>
    <div>
      <svg width="100%" height="100%" viewBox="0 0 1251 1920" preserveAspectRatio="none">
        <image width="1251" height="1920" xlink:href="cover.jpeg"/>
      </svg>
    </div>
  </body>
</html>`),
          basename: "foo.xhtml",
          uri: "foo.xhtml",
          dir: false,
          size: 1,
        },
      ],
    }

    const response = await calibreFixHook({ archive, resourcePath: "foo.xhtml" })({
      params: {
        status: 200,
      },
    })

    expect(response.body?.replace(/>\s*/g, ">").replace(/\s*</g, "<")).toEqual(
      `
      <html>
        <head>
        <meta name="calibre:cover" content="true"/>
        </head>
        <body>
          <div>
            <svg width="100%" height="100%" viewBox="0 0 1251 1920">
              <image width="1251" height="1920" xlink:href="cover.jpeg"/>
            </svg>
          </div>
        </body>
      </html>`
        .replace(/>\s*/g, ">")
        .replace(/\s*</g, "<"),
    )
  })
})
