import {
  createArchiveFromExpoFileSystemNext,
  ReactNativeStreamer,
} from "@prose-reader/react-native"
import { Directory } from "expo-file-system"
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
