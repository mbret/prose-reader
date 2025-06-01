import { Directory, Paths } from "expo-file-system/next"

export const epubsDestination = new Directory(Paths.cache, "epubs")
export const epubsDownloadsDestination = new Directory(
  epubsDestination,
  "downloads",
)
export const unzippedDestination = new Directory(epubsDestination, "raw")
