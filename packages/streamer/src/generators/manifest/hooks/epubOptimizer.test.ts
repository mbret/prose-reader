import { generateManifestFromArchive } from "../index"
import { epubOptimizerHook } from "./epubOptimizer"
import { createArchiveFromText } from "../../../archives/createArchiveFromText"
import { describe, expect, it } from "vitest"

describe(`Given a xml document`, () => {
  describe(`when there is a meta viewport`, () => {
    it(`should return a valid pre-paginated manifest`, async () => {
      const archive = await createArchiveFromText(
        `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>Page 2</title>
          <meta name="viewport" content="width=569, height=739" />
          <link rel="stylesheet" type="application/vnd.adobe-page-template+xml" href="page-template.xpgt"/>
          <style type='text/css'>
            @import url(stylesheet.css);
          </style>
        </head>
        <body class='standard-portrait style-modern'>
          <div class='page'>
            <div class='figure full-bleed'>
            <img src='images/i002.jpg' alt='image'/></div>
          </div>
        </body>
      </html>`,
        {
          mimeType: "application/xhtml+xml",
        },
      )

      const firstManifest = await generateManifestFromArchive(archive)

      const manifest = await epubOptimizerHook({ archive, baseUrl: "" })(firstManifest)

      expect(manifest).toEqual({
        ...firstManifest,
        renditionLayout: "pre-paginated",
      })
    })
  })

  describe(`when there is no meta viewport`, () => {
    it(`should return a valid pre-paginated manifest`, async () => {
      const archive = await createArchiveFromText(
        `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>Page 2</title>
          <link rel="stylesheet" type="application/vnd.adobe-page-template+xml" href="page-template.xpgt"/>
          <style type='text/css'>
            @import url(stylesheet.css);
          </style>
        </head>
        <body class='standard-portrait style-modern'>
          <div class='page'>
            <div class='figure full-bleed'>
            <img src='images/i002.jpg' alt='image'/></div>
          </div>
        </body>
      </html>`,
        {
          mimeType: "application/xhtml+xml",
        },
      )

      const firstManifest = await generateManifestFromArchive(archive)

      const manifest = await epubOptimizerHook({ archive, baseUrl: "" })(firstManifest)

      expect(manifest).toEqual(firstManifest)
    })
  })

  describe(`when there is more than one meta viewport`, () => {
    it(`should return a valid pre-paginated manifest`, async () => {
      const archive = await createArchiveFromText(
        `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>Page 2</title>
          <meta xmlns="http://www.w3.org/1999/xhtml" http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=569, height=739" />
        </head>
        <body class='standard-portrait style-modern'>
          <div class='page'>
            <div class='figure full-bleed'>
            <img src='images/i002.jpg' alt='image'/></div>
          </div>
        </body>
      </html>`,
        {
          mimeType: "application/xhtml+xml",
        },
      )

      const firstManifest = await generateManifestFromArchive(archive)

      const manifest = await epubOptimizerHook({ archive, baseUrl: "" })(firstManifest)

      expect(manifest).toEqual({
        ...firstManifest,
        renditionLayout: "pre-paginated",
      })
    })
  })
})

describe(`Given a non xml resource`, () => {
  it(`should not crash or alter the manifest`, async () => {
    const archive = await createArchiveFromText(`I am just text`)

    const firstManifest = await generateManifestFromArchive(archive)

    const manifest = await epubOptimizerHook({ archive, baseUrl: "" })(firstManifest)

    expect(manifest).toEqual(firstManifest)
  })
})
