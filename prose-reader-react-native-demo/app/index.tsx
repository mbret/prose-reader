import { Text, View } from "react-native"
import {
  epubsDownloadsDestination,
  epubsDestination,
} from "@/components/constants"
import { useUnzipFile } from "@/components/useUnzipFile"
import { useDownloadFile } from "@/components/useDownloadFile"

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

  return (
    <View>
      <Text>Hello</Text>
    </View>
  )
}
