export const getUriBasename = (uri: string) => uri.substring(uri.lastIndexOf(`/`) + 1) || uri
