import {
  epubsDestination,
  epubsDownloadsDestination,
} from "@/components/constants"
import { Reader } from "@/components/reader/Reader"
import { useDownloadFile } from "@/components/useDownloadFile"
import { useUnzipFile } from "@/components/useUnzipFile"

/**
 * Initialize the folder where we will store the epubs
 */
if (!epubsDestination.exists) {
  epubsDestination.create()
}

/**
 * Initialize the folder where we will store the downloaded epubs
 */
if (!epubsDownloadsDestination.exists) {
  epubsDownloadsDestination.create()
}

export default function HomeScreen() {
  const file = useDownloadFile(
    "https://www.gutenberg.org/ebooks/76073.epub3.images",
  )

  const unzippedFileDirectory = useUnzipFile(file)

  if (!file?.name) {
    return null
  }

  return (
    <Reader
      unzippedFileDirectory={unzippedFileDirectory}
      epubFileName={file.name}
    />
  )
}
