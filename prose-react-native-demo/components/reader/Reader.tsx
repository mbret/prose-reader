import { ReaderProvider, useCreateReader } from "@prose-reader/react-native"
import type { Directory } from "expo-file-system/next"
import { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import { BottomMenu } from "./BottomMenu"
import { streamer } from "./Streamer"
import { TopMenu } from "./TopMenu"
import { useWebviewHtmlAsset } from "./useWebviewHtmlAsset"

export const Reader = ({
  unzippedFileDirectory,
  epubFileName,
}: {
  unzippedFileDirectory: Directory | null
  epubFileName: string
}) => {
  const [isWebViewLoaded, setIsWebViewLoaded] = useState(false)
  const { html } = useWebviewHtmlAsset()
  const reader = useCreateReader({
    async getResource(resource) {
      return streamer.fetchResourceAsData({
        key: epubFileName,
        resourcePath: resource.href,
      })
    },
  })
  const ReaderWebView = reader?.ReaderWebView

  useEffect(() => {
    if (isWebViewLoaded && reader && unzippedFileDirectory) {
      streamer
        .fetchManifest({
          key: epubFileName,
        })
        .then(async (response) => {
          const manifest = await response.json()

          reader.load(manifest)
        })
    }
  }, [isWebViewLoaded, reader, unzippedFileDirectory, epubFileName])

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
