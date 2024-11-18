export const getUriBasename = (uri: string) =>
  uri.substring(uri.lastIndexOf(`/`) + 1) || uri

export const removeTrailingSlash = (uri: string) =>
  uri.endsWith("/") ? uri.slice(0, -1) : uri

export const getUriBasePath = (uri: string) => {
  const lastSlashIndex = uri.lastIndexOf("/")

  return lastSlashIndex >= 0 ? uri.substring(0, lastSlashIndex) : ""
}
