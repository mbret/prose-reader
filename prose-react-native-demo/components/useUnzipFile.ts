import { Directory, type File } from "expo-file-system/next"
import { useEffect, useState } from "react"
import { unzip } from "react-native-zip-archive"
import { unzippedDestination } from "./constants"

export const useUnzipFile = (file: File | undefined | null) => {
  const [unzippedFileDirectory, setUnzippedFileDirectory] =
    useState<Directory | null>(null)

  useEffect(() => {
    let isMounted = true
    if (!file) return
    ;(async () => {
      try {
        setUnzippedFileDirectory(null)

        const unzippedFileDirectory = new Directory(
          unzippedDestination,
          file.uri.split("/").pop() ?? "",
        )

        await unzip(file.uri, `${unzippedFileDirectory.uri}`)

        if (!isMounted) return

        setUnzippedFileDirectory(unzippedFileDirectory)
      } catch (error) {
        console.error(error)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [file])

  return unzippedFileDirectory
}
