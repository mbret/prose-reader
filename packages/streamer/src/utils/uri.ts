export const removeTrailingSlash = (uri: string) =>
  uri.endsWith("/") ? uri.slice(0, -1) : uri

export const getUriBasename = (uri: string) => {
  const trimmed = removeTrailingSlash(uri)

  return trimmed.substring(trimmed.lastIndexOf(`/`) + 1) || trimmed
}

export const getUriBasePath = (uri: string) => {
  const lastSlashIndex = uri.lastIndexOf("/")

  return lastSlashIndex >= 0 ? uri.substring(0, lastSlashIndex) : ""
}
