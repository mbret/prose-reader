/**
 * A path segment a URL parser reads as `.` or `..`, each dot written as itself
 * or escaped as `%2e`, in either case (WHATWG URL, single-dot and double-dot
 * URL path segments). Only a reference is read this way: once decoded, a `%2e`
 * is part of a file name, which a reference escapes as `%252e`.
 */
const SINGLE_DOT_SEGMENT = /^(?:\.|%2e)$/i
const DOUBLE_DOT_SEGMENT = /^(?:\.|%2e){2}$/i

/**
 * The name a URL path segment stands for. A malformed escape, such as the
 * bare `%` of `100%.xhtml`, makes no URL, but may still name a record as
 * written.
 */
const decodeUrlPathSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

const isHttpUrl = (href: string) => /^https?:\/\//.test(href)

/**
 * A reference's path, and its query and fragment, which a URL parser keeps out
 * of the path: a `/` or a dot in them separates no segment.
 */
const splitReferencePath = (href: string) => {
  const pathEnd = href.search(/[?#]/)

  return pathEnd < 0
    ? { path: href, queryAndFragment: "" }
    : { path: href.slice(0, pathEnd), queryAndFragment: href.slice(pathEnd) }
}

/**
 * Rebases a reference's path onto `basePath`, the folder of the document
 * making it, and resolves its dot segments (RFC 3986 §5.2.4 "remove dot
 * segments") as a browser does, escaped dots included: the path a browser
 * requests for the reference joined onto a base URL. A `..` past the root is
 * clamped, matching URL resolution. Each segment of the path that is kept goes
 * through `toSegment`.
 */
const resolveReferencePath = (
  path: string,
  basePath: string,
  toSegment: (segment: string) => string,
): string => {
  const segments = basePath ? basePath.split("/") : []

  for (const segment of path.split("/")) {
    if (SINGLE_DOT_SEGMENT.test(segment)) continue
    if (DOUBLE_DOT_SEGMENT.test(segment)) {
      segments.pop()
      continue
    }
    segments.push(toSegment(segment))
  }

  return segments.join("/")
}

/**
 * Rebases a reference the book makes (an OPF manifest `href`, a table of
 * contents link…) onto `basePath`, the folder of the document making it,
 * resolving its dot segments (`OEBPS/Text` + `../Images/cover.jpg` →
 * `OEBPS/Images/cover.jpg`) and keeping its escapes: the reference, in the
 * container's coordinate space, to join onto a base URL. A table of contents
 * and the spine spell a resource alike this way. Absolute http(s) urls (the
 * URL-list pseudo-archives author these) pass through untouched.
 */
export const toContainerHref = (href: string, basePath: string): string => {
  if (isHttpUrl(href)) return href

  const { path, queryAndFragment } = splitReferencePath(href)

  return (
    resolveReferencePath(path, basePath, (segment) => segment) +
    queryAndFragment
  )
}

/**
 * Resolves an OPF manifest-relative `href` to the uri of the archive record it
 * names, the coordinate space every resolved archive part addresses. As
 * {@link toContainerHref}, with each segment then percent-decoded, since the
 * reference is a URL: `Text/Chapter%201.xhtml` names the record
 * `Text/Chapter 1.xhtml`. Its query and fragment name no part of the record.
 * An absolute http(s) url is its own record uri.
 */
export const toContainerUri = (href: string, basePath: string): string => {
  if (isHttpUrl(href)) return href

  return resolveReferencePath(
    splitReferencePath(href).path,
    basePath,
    decodeUrlPathSegment,
  )
}
