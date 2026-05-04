import type { ArchiveResolveResult } from "../types/archiveResolve"
import type { AppleMetadata } from "./parse"

export const resolveApple = (input: AppleMetadata): ArchiveResolveResult => {
  const fixedLayout = input.displayOptions?.platform?.options?.find(
    (o) => o.name === "fixed-layout",
  )?.value

  if (fixedLayout === undefined) return {}

  const renditionLayout =
    fixedLayout.trim().toLowerCase() === "true"
      ? ("pre-paginated" as const)
      : undefined

  return renditionLayout !== undefined ? { renditionLayout } : {}
}
