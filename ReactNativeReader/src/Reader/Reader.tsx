import React, { useCallback, useRef, useState } from 'react'
import { ReaderWebView } from './ReaderWebView'
import { Server } from './Server'
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider'
import { usePostMessageDown } from './useMessages';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useManifest } from './useManifest';
import { MessageUp } from '../../web/src/types/shared';

export const Reader = () => {
  const webViewRef = useRef<WebView>()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const manifest = useManifest()
  const postMessageDown = usePostMessageDown(webViewRef.current)

  const onMessageUp = useCallback((event: WebViewMessageEvent) => {
    const data = JSON.parse(event.nativeEvent.data) as MessageUp
    switch (data.event) {
      case 'menuTap': {
        return setIsMenuOpen(v => !v)
      }
    }
  }, [])

  return (
    <>
      <ReaderWebView
        ref={webViewRef}
        manifest={manifest}
        onMessage={onMessageUp}
        onMenuToggle={() => setIsMenuOpen(v => !v)}
      />
      {isMenuOpen && (
        <>
          <View style={styles.menuTopContainer}>
            <Text style={styles.text}>My comic: Chapter 1</Text>
          </View>
          <View style={styles.menuBottomContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={(manifest?.spineItems.length || 0) - 1}
              step={1}
              onValueChange={index => {
                postMessageDown({ event: 'goTo', data: index })
              }}
              minimumTrackTintColor="white"
              maximumTrackTintColor="#000000"
            />
          </View>
        </>
      )}
      <Server />
    </>
  )
}

const styles = StyleSheet.create({
  text: { color: 'white' },
  slider: { width: '80%' },
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
