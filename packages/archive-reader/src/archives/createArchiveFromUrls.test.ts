import { describe, expect, it } from "vitest"
import { resolveArchiveReadingOrder } from "../readingOrder/resolveArchiveReadingOrder"
import { createArchiveFromUrls } from "./createArchiveFromUrls"
import { isFileRecord } from "./types"

describe(`Given urls with a query or a fragment`, () => {
  const urls = [
    `https://cdn.example.com/page-1.jpg?token=abc`,
    `https://cdn.example.com/page-2.png#page`,
  ]

  it(`should read each page's type from the url's path`, async () => {
    const archive = await createArchiveFromUrls(urls)
    const pages = archive.records
      .filter(isFileRecord)
      .filter((record) => urls.includes(record.uri))

    expect(pages.map(({ encodingFormat }) => encodingFormat)).toEqual([
      `image/jpg`,
      `image/png`,
    ])
    expect(
      (await resolveArchiveReadingOrder(archive)).map(
        ({ mediaType }) => mediaType,
      ),
    ).toEqual([`image/jpg`, `image/png`])
  })
})
