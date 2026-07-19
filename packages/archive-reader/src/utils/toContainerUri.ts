/**
 * Resolves the `.`/`..` segments of a container path (RFC 3986 §5.2.4
 * "remove dot segments"), so a manifest href authored relative to a nested
 * package document lands on the real record uri. Operates on the raw path
 * (no percent-decoding) so the result still matches the archive's record uris
 * verbatim. A `..` past the root is clamped, matching URL resolution.
 */
const removeDotSegments = (path: string): string => {
  const out: string[] = []

  for (const segment of path.split("/")) {
    if (segment === ".") continue
    if (segment === "..") {
      out.pop()
      continue
    }
    out.push(segment)
  }

  return out.join("/")
}

/**
 * Rebases an OPF manifest-relative `href` (spine item, cover image…) onto the
 * package document's `basePath` to produce a container-relative uri — the
 * coordinate space every resolved archive part addresses. The href is a
 * relative reference resolved against the package document's directory, so
 * dot segments are collapsed (`OEBPS/Text` + `../Images/cover.jpg` →
 * `OEBPS/Images/cover.jpg`), not concatenated verbatim. Absolute http(s) urls
 * (the URL-list pseudo-archives author these) are their own record uri and
 * pass through untouched.
 */
export const toContainerUri = (href: string, basePath: string): string => {
  if (/^https?:\/\//.test(href)) return href

  return removeDotSegments(basePath ? `${basePath}/${href}` : href)
}
