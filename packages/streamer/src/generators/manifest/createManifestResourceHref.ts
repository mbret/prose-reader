// encodeURI leaves `#` and `?` untouched (reserved URI delimiters), but in
// a raw archive filename they are data and would otherwise be parsed as
// fragment/query by whatever fetches the href (a fragment never even reaches
// the streamer). Same escaping as the archive-reader toc containerHref.
const encodeResourcePath = (resourcePath: string) =>
  encodeURI(resourcePath).replace(/#/g, `%23`).replace(/\?/g, `%3F`)

export const createManifestResourceHref = ({
  baseUrl = ``,
  resourcePath,
}: {
  baseUrl?: string
  resourcePath: string
}) => {
  if (!baseUrl && /^https?:\/\//.test(resourcePath)) {
    return encodeURI(resourcePath)
  }

  const hrefBaseUrl = baseUrl
    ? `${baseUrl}${baseUrl.endsWith(`/`) ? `` : `/`}`
    : `file://`

  return `${encodeURI(hrefBaseUrl)}${encodeResourcePath(resourcePath)}`
}
