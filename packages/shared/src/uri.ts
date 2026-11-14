export const removeTrailingSlash = (uri: string) =>
  uri.endsWith("/") ? uri.slice(0, -1) : uri

export const getUriBasename = (uri: string) => {
  const trimmed = removeTrailingSlash(uri)

  return trimmed.substring(trimmed.lastIndexOf(`/`) + 1) || trimmed
}

/**
 * The extension of a uri's last segment, without its dot: `jpg` for
 * `Batman #12/Batman #12 - 001.jpg`. Empty when that segment has no extension,
 * as `README`, `.hidden` or `notes.`. A `#` or a `?` is part of the name: an
 * archive's uris and file names are paths, not URLs.
 */
export const getUriExtension = (uri: string) => {
  const basename = getUriBasename(uri)
  const lastDotIndex = basename.lastIndexOf(".")

  return lastDotIndex > 0 ? basename.substring(lastDotIndex + 1) : ""
}

export const getUriBasePath = (uri: string) => {
  const lastSlashIndex = uri.lastIndexOf("/")

  return lastSlashIndex >= 0 ? uri.substring(0, lastSlashIndex) : ""
}
