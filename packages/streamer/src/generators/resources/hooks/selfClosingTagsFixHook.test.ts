import { describe, expect, it } from "vitest"
import type { Archive } from "../../../archives/types"
import { selfClosingTagsFixHook } from "./selfClosingTagsFixHook"

describe("Given a book with invalid self closing tag", () => {
  it("should fix the self closing tag", async () => {
    const archive: Archive = {
      filename: "",
      files: [
        {
          blob: () => Promise.resolve(new Blob([])),
          string: () =>
            Promise.resolve(`
              <?xml version="1.0" encoding="UTF-8"?>
              <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
                <head>
                  <meta charset="utf-8"/>
                  <title>Re:ZERO -Starting Life in Another World-, Vol. 2</title>
                  <link rel="stylesheet" href="css/style.css" type="text/css"/>
                  <meta name="viewport" content="width=900, height=1350"/>
                  <!-- kobo-style -->
                  <script xmlns="http://www.w3.org/1999/xhtml" type="text/javascript" src="../js/kobo.js"/>
                </head>
                <body>
                  <div class="page">
                      <img src="images/001.jpg" alt=""/>
                  </div>
                </body>
              </html>
          `),
          basename: "foo.xhtml",
          uri: "foo.xhtml",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const response = await selfClosingTagsFixHook({
      archive,
      resourcePath: "foo.xhtml",
    })({
      params: {},
    })

    expect(response.body?.replace(/>\s*/g, ">").replace(/\s*</g, "<")).toEqual(
      `
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
        <head>
          <meta charset="utf-8"/>
          <title>Re:ZERO -Starting Life in Another World-, Vol. 2</title>
          <link rel="stylesheet" href="css/style.css" type="text/css"/>
          <meta name="viewport" content="width=900, height=1350"/>
          <!-- kobo-style -->
          <script xmlns="http://www.w3.org/1999/xhtml" type="text/javascript" src="../js/kobo.js"></script>
        </head>
        <body>
          <div class="page">
              <img src="images/001.jpg" alt=""/>
          </div>
        </body>
      </html>
      `
        .replace(/>\s*/g, ">")
        .replace(/\s*</g, "<"),
    )
  })
})
