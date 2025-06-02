import { File } from "expo-file-system/next"
import { useEffect, useState } from "react"
import { epubsDownloadsDestination } from "./constants"

export const useDownloadFile = (url: string) => {
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      setFile(null)

      const filename = `${url.split("/").pop() ?? ""}`
      const downloadedFile = new File(epubsDownloadsDestination, filename)

      if (!downloadedFile.exists) {
        const file = await File.downloadFileAsync(
          "https://www.gutenberg.org/ebooks/76073.epub3.images",
          epubsDownloadsDestination,
        )

        if (!isMounted) return

        file.move(downloadedFile)
      }

      setFile(downloadedFile)
    })()

    return () => {
      isMounted = false
    }
  }, [url])

  return file
}
