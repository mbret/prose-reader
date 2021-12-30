import { Manifest } from '@prose-reader/core';
import { MessageDown } from './shared';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    },
    SETTINGS?: {
      isNativeApp: boolean,
      origin: string,
    },
    MANIFEST: Manifest,
    postDownMessage: (message: MessageDown) => void
  }
}

export { }
