export const getEpubFilenameFromUrl = (url: string) => {
  return url.substring(url.lastIndexOf("/") + 1)
}
