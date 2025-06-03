import {
  ReactNativeStreamer,
  createArchiveFromExpoFileSystemNext,
} from "@prose-reader/react-native"
import { Directory } from "expo-file-system/next"
import { unzippedDestination } from "../constants"

export const streamer = new ReactNativeStreamer({
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
})
