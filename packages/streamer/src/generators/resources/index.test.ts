import { describe, expect, it } from "vitest"
import { createArchive } from "../../archives/createArchive"
import { blobFileAccessors } from "../../archives/fileAccessors"
import { generateResourceFromArchive } from "./index"

describe("generateResourceFromArchive", () => {
  it("should apply external hooks before archive fallback", async () => {
    const archive = createArchive({
      filename: "",
      records: [],
      close: () => Promise.resolve(),
    })

    const resource = await generateResourceFromArchive(archive, "virtual.txt", {
      hooks: [
        () => async (resource) => ({
          ...resource,
          body: "hooked",
          params: {
            ...resource.params,
            contentType: "text/plain",
          },
        }),
      ],
    })

    expect(resource).toEqual({
      body: "hooked",
      params: {
        contentType: "text/plain",
      },
    })
  })

  it("should return the archive resource without external hooks", async () => {
    const source = new Blob(["source"], { type: "text/plain" })
    const archive = createArchive({
      filename: "",
      records: [
        {
          ...blobFileAccessors(() => Promise.resolve(source)),
          basename: "page.txt",
          dir: false,
          size: source.size,
          uri: "page.txt",
        },
      ],
      close: () => Promise.resolve(),
    })

    const resource = await generateResourceFromArchive(archive, "page.txt")

    expect(resource.body).toBe(source)
  })
})
