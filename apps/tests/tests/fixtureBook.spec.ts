import { expect, test } from "@playwright/test"
import { waitForSettled } from "./utils/pagination"
import { getReader } from "./utils/reader"
import {
  DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING,
  isResourceLoading,
} from "./utils/resourceLoading"

/**
 * A project runs every spec with its scenarios loading their book one way,
 * and nothing in a spec says which. This is what proves each project runs the
 * way it says it does, rather than the way it would by default.
 */
const getProjectResourceLoading = () => {
  const { name, metadata } = test.info().project

  if (!isResourceLoading(metadata.resourceLoading)) {
    throw new Error(`The project "${name}" names no resource loading`)
  }

  return metadata.resourceLoading
}

test.describe("Given a scenario opening its book with openFixtureBook", () => {
  test("its reader loads the documents the way its project asks", async ({
    page,
  }) => {
    await page.goto(
      "http://localhost:3333/tests/navigation/restoration/epub/index.html",
    )
    // Settled on the first chapter, which is then loaded.
    await waitForSettled(page)

    const documentProtocols = await (await getReader(page)).evaluate((reader) =>
      reader.spineItemsManager.items.flatMap(({ loadedDocument }) =>
        loadedDocument ? [new URL(loadedDocument.URL).protocol] : [],
      ),
    )

    expect(documentProtocols).not.toHaveLength(0)
    expect(new Set(documentProtocols)).toEqual(
      new Set([
        DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING[getProjectResourceLoading()],
      ]),
    )
  })
})
