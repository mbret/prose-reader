import type { Archive } from "../archives/types"
import { type ArchiveOpfParsed, readArchiveOpf } from "../opf/readArchiveOpf"
import { buildTocFromFolders } from "./folders"
import { resolveTocFromNav } from "./nav"
import { resolveTocFromNcx } from "./ncx"
import type { ArchiveTocItem } from "./types"

/**
 * Resolve the table of contents of an archive into a generic, container
 * relative JSON structure ({@link ArchiveTocItem}). Consumers never have to
 * deal with the underlying XML (EPUB nav document, NCX) or archive layout.
 *
 * Strategies, in order:
 * - EPUB nav document (`properties="nav"` manifest item)
 * - NCX (`spine@toc` idref)
 * - EPUB-like containers with neither resolve to an explicit empty TOC — the
 *   folder layout of an EPUB zip is not a meaningful TOC.
 * - Anything else falls back to the folder hierarchy, or `undefined` when the
 *   archive is flat (no folder to derive entries from).
 *
 * Pass `opf` when you already hold the parsed OPF (e.g. during manifest
 * generation) to skip the internal lookup.
 */
export const resolveArchiveToc = async (
  archive: Archive,
  { opf }: { opf?: ArchiveOpfParsed } = {},
): Promise<ArchiveTocItem[] | undefined> => {
  const archiveOpf = opf ?? (await readArchiveOpf(archive))

  if (archiveOpf) {
    const tocFromNav = await resolveTocFromNav(archiveOpf.opf, archive)

    if (tocFromNav) return tocFromNav

    const tocFromNcx = await resolveTocFromNcx({
      opf: archiveOpf.opf,
      opfBasePath: archiveOpf.basePath,
      archive,
    })

    if (tocFromNcx) return tocFromNcx

    return []
  }

  const tocFromFolders = buildTocFromFolders(archive)

  return tocFromFolders.length === 0 ? undefined : tocFromFolders
}
