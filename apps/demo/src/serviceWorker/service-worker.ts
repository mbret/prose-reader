/// <reference lib="webworker" />
// Sets globalThis.__PROSE_READER_DEBUG before the prose-reader modules load,
// which auto-enables their Report logging (streamer and archive-reader alike).
import "./debug"
import { swStreamer } from "../streamer/streamer.sw"

declare const self: ServiceWorkerGlobalScope

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
