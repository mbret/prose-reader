import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

describe("playground archive-reader resolution", () => {
  it("loads both archive-reader imports from TypeScript source", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--conditions=prose-source",
        "--input-type=module",
        "--eval",
        `
          const rootUrl = import.meta.resolve("@prose-reader/archive-reader")
          const zipUrl = import.meta.resolve(
            "@prose-reader/archive-reader/archives/createArchiveFromZipJs",
          )
          const [root, zip] = await Promise.all([import(rootUrl), import(zipUrl)])

          console.log(JSON.stringify({
            rootUrl,
            zipUrl,
            resolveArchive: typeof root.resolveArchive,
            createArchiveFromZipJs: typeof zip.createArchiveFromZipJs,
          }))
        `,
      ],
      { encoding: "utf8" },
    )

    expect(JSON.parse(output)).toEqual({
      rootUrl: new URL(
        "../../../../packages/archive-reader/src/index.ts",
        import.meta.url,
      ).href,
      zipUrl: new URL(
        "../../../../packages/archive-reader/src/archives/createArchiveFromZipJs.ts",
        import.meta.url,
      ).href,
      resolveArchive: "function",
      createArchiveFromZipJs: "function",
    })
  })
})
