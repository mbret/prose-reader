import type { Manifest } from "@prose-reader/shared"

export const waitFor = async (timeout: number) =>
  await new Promise((resolve) => setTimeout(resolve, timeout))

export const createTestManifestSpineItems = (
  items: number | Array<Partial<Manifest["spineItems"][number]> | undefined>,
): Manifest["spineItems"] => {
  const itemsOverrides =
    typeof items === "number"
      ? Array.from({ length: items }, () => undefined)
      : items

  return itemsOverrides.map((overrides, index) => ({
    href: `item-${index}.xhtml`,
    id: `item-${index}`,
    mediaType: `application/xhtml+xml`,
    ...overrides,
    index,
  }))
}

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
