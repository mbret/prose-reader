import type { Manifest } from "@prose-reader/shared"

export const waitFor = async (timeout: number) =>
  await new Promise((resolve) => setTimeout(resolve, timeout))

export const createTestManifest = (
  manifest: Partial<Manifest> = {},
): Manifest => ({
  filename: "test",
  title: "test",
  renditionLayout: undefined,
  renditionSpread: undefined,
  readingDirection: "ltr",
  spineItems: [],
  items: [],
  ...manifest,
})
