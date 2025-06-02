import {
  ReactNativeStreamer,
  createArchiveFromExpoFileSystemNext,
} from "@prose-reader/react-native"
import { Directory } from "expo-file-system/next"
import { useState } from "react"
import { unzippedDestination } from "../constants"

export const useStreamer = () => {
  const [streamer] = useState(
    () =>
      new ReactNativeStreamer({
        getArchive: async (epubFolderName) => {
          const archive = await createArchiveFromExpoFileSystemNext(
            new Directory(unzippedDestination, epubFolderName),
            {
              orderByAlpha: true,
              name: "archive.zip",
            },
          )

          return archive
        },
      }),
  )

  return streamer
}
