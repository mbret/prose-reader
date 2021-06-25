import React, { useCallback, useRef } from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { createArchiveFromUrls, getManifestFromArchive } from '@oboku/reader-streamer';
import type { Manifest } from '@oboku/reader';
import { useState } from 'react';
import { useEffect } from 'react';
import { useOrigin } from './Server';
import RNFS from 'react-native-fs';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider'

export const ReaderWebView = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [manifest, setManifest] = useState<Manifest | undefined>()
  const webViewRef = useRef<WebView>()
  const origin = useOrigin()

  useEffect(() => {
    if (origin) {
      (async () => {
        const content = await RNFS.readDirAssets(`haruko`)
        const urls = content.map(file => `${origin}/${file.path}`)

        const archive = await createArchiveFromUrls(urls)


        // const response = await getManifestFromArchive(archive, { baseUrl: origin });
        const response = await getManifestFromArchive(archive, { baseUrl: '' });

        const manifest: Manifest = await response.json();

        console.log(manifest)

        setManifest(manifest)
      })();
    }
  }, [origin])

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const data = JSON.parse(event.nativeEvent.data)
    switch (data.event) {
      case 'menuTap': {
        return setIsMenuOpen(v => !v)
      }
    }
  }, [setIsMenuOpen])

  const injectableScript = `
    window.MANIFEST = ${JSON.stringify(manifest)};
    window.SETTINGS = ${JSON.stringify({
    isNativeApp: true,
    origin,
  })};
    true; // note: this is required, or you'll sometimes get silent failures
  `

  return (
    <>

      {manifest && origin && (
        <WebView
          ref={webViewRef as any}
          containerStyle={{
            flex: 1,
            // height: 300
          }}
          onLoad={() => console.log('LOAD')}
          originWhitelist={['*']}
          // source={{ uri: 'https://oboku-reader.vercel.app/' }}
          // source={{ uri: 'file:///android_asset/index.html'}}
          // source={{ uri: `${origin}/index.html`}}
          source={{ uri: 'http://localhost:8082/' }}
          style={{ marginTop: 20 }}
          onMessage={onMessage}
          allowUniversalAccessFromFileURLs
          injectedJavaScriptBeforeContentLoaded={injectableScript}
        // onLoad={console.log}
        // onLoadEnd={console.log}
        // onError={console.log}
        />
      )}
      {isMenuOpen && (
        <>
          <View style={styles.menuTopContainer}>
            <Text style={{ color: 'white' }}>My comic: Chapter 1</Text>
          </View>
          <View style={styles.menuBottomContainer}>
            <Slider
              style={{ width: '80%' }}
              minimumValue={0}
              maximumValue={(manifest?.readingOrder.length || 0) - 1}
              step={1}
              onValueChange={index => {
                webViewRef.current?.injectJavaScript(`
                  window.postDownMessage(${JSON.stringify({ event: 'goTo', data: index })});
                  true;
                `)
              }}
              minimumTrackTintColor="white"
              maximumTrackTintColor="#000000"
            />
          </View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  menuTopContainer: {
    height: 100,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#141d55',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  menuBottomContainer: {
    height: 100,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: '#141d55',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
})
