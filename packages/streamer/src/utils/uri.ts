export const getUriBasename = (uri: string) =>
  uri.substring(uri.lastIndexOf(`/`) + 1) || uri

export const removeTrailingSlash = (uri: string) =>
  uri.endsWith("/") ? uri.slice(0, -1) : uri
