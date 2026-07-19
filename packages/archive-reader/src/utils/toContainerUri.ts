/**
 * Rebases an OPF manifest-relative `href` (spine item, cover image…) onto the
 * package document's `basePath` to produce a container-relative uri — the
 * coordinate space every resolved archive part addresses. Absolute http(s)
 * urls (the URL-list pseudo-archives author these) are their own record uri
 * and pass through untouched.
 */
export const toContainerUri = (href: string, basePath: string): string => {
  if (/^https?:\/\//.test(href)) return href

  return basePath ? `${basePath}/${href}` : href
}
