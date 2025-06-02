import { ReaderProvider, useCreateReader } from "@prose-reader/react-native"
import type { Directory } from "expo-file-system/next"
import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { unzippedDestination } from "../constants"
import { BottomMenu } from "./BottomMenu"
import { TopMenu } from "./TopMenu"
import { useStreamer } from "./useStreamer"
import { useWebviewHtmlAsset } from "./useWebviewHtmlAsset"

export const Reader = ({
  unzippedFileDirectory,
  epubFileName,
}: {
  unzippedFileDirectory: Directory | null
  epubFileName: string | null
}) => {
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false)
  const { html } = useWebviewHtmlAsset()
  const streamer = useStreamer()
  const reader = useCreateReader({
    /**
     * For a given spine item, provide the resource to the webview.
     */
    async getResource(resource) {
      // extract the path after unzippedDestination.uri from resource.href and until the next /
      const epubFolderName = resource.href
        .substring(unzippedDestination.uri.length)
        .split("/")[0]

      return streamer.fetchResourceAsData({
        key: epubFolderName,
        resourcePath: resource.href,
      })
    },
  })
  const ReaderWebView = reader?.ReaderWebView

  useEffect(() => {
    if (isWebViewLoaded && reader && epubFileName && unzippedFileDirectory) {
      streamer
        .fetchManifest({
          key: epubFileName,
        })
        .then(async (response) => {
          const manifest = await response.json()

          reader.load(manifest)
        })
    }
  }, [isWebViewLoaded, reader, streamer, epubFileName, unzippedFileDirectory])

  if (!reader) {
    return null
  }

  return (
    <ReaderProvider reader={reader}>
      <View style={styles.container}>
        {!!html && !!ReaderWebView && (
          <ReaderWebView
            style={styles.webview}
            originWhitelist={["*"]}
            source={{ html }}
            onLoadEnd={() => {
              setIsWebViewLoaded(true)
            }}
            webviewDebuggingEnabled
            javaScriptEnabled={true}
          />
        )}
        <TopMenu />
        <BottomMenu />
      </View>
    </ReaderProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
  },
})
