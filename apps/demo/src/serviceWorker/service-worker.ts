/// <reference lib="webworker" />
import { configure } from "@prose-reader/streamer"
import { swStreamer } from "../streamer/streamer.sw"

declare const self: ServiceWorkerGlobalScope

configure({
  enableReport: !import.meta.env.PROD,
})

// @ts-expect-error self.__WB_MANIFEST not typed
console.log(self.__WB_MANIFEST)

// biome-ignore lint/suspicious/noExplicitAny: TODO
self.addEventListener("install", (e: ExtendableEvent & any) => {
  console.log("service worker install")
  e.waitUntil(self.skipWaiting()) // Activate worker immediately

  setTimeout(async () => {
    const client = await self.clients.get(e.clientId)
    if (!e.clientId) {
      console.log("no client id")
      return
    }
    client?.postMessage({
      msg: "Hey I just got a fetch from you!",
    })
  })
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim()) // Become available to all pages
})

self.addEventListener("fetch", swStreamer.fetchEventListener)
