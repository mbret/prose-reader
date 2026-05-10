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

  return encodeURI(`${hrefBaseUrl}${resourcePath}`)
}
