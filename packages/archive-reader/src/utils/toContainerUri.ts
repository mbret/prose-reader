/**
 * Resolves the `.`/`..` segments of a container path (RFC 3986 §5.2.4
 * "remove dot segments"), so a manifest href authored relative to a nested
 * package document lands on the real record uri. A `..` past the root is
 * clamped, matching URL resolution.
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
 * The path a URL path stands for. A malformed escape, such as the bare `%` of
 * `100%.xhtml`, makes no URL, but may still name a record as written.
 */
const decodeUrlPath = (path: string): string => {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

const isHttpUrl = (href: string) => /^https?:\/\//.test(href)

/**
 * Rebases an OPF manifest-relative `href` (spine item, cover image…) onto the
 * package document's `basePath`, collapsing its dot segments (`OEBPS/Text` +
 * `../Images/cover.jpg` → `OEBPS/Images/cover.jpg`) and keeping its escapes:
 * the reference the book makes, in the container's coordinate space, to join
 * onto a base URL. Absolute http(s) urls (the URL-list pseudo-archives author
 * these) pass through untouched.
 */
export const toContainerHref = (href: string, basePath: string): string => {
  if (isHttpUrl(href)) return href

  return removeDotSegments(basePath ? `${basePath}/${href}` : href)
}

/**
 * Resolves an OPF manifest-relative `href` to the uri of the archive record it
 * names, the coordinate space every resolved archive part addresses. As
 * {@link toContainerHref}, with the href percent-decoded first, since it is a
 * URL: `Text/Chapter%201.xhtml` names the record `Text/Chapter 1.xhtml`. An
 * absolute http(s) url is its own record uri.
 */
export const toContainerUri = (href: string, basePath: string): string => {
  if (isHttpUrl(href)) return href

  return toContainerHref(decodeUrlPath(href), basePath)
}
