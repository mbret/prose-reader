import { loadEpub } from './loadEpub';
import { getResourceFromArchive, getManifestFromArchive } from '@oboku/reader-streamer'
import { STREAMER_URL_PREFIX } from './constants';
import { extractInfoFromEvent, getResourcePath } from './utils';

// @todo typing
const worker: any = self as any;

self.__OBOKU_READER_DEBUG = true

worker.addEventListener('install', function (e: any) {
  console.log('service worker install')
  e.waitUntil(worker.skipWaiting()); // Activate worker immediately

  setTimeout(async () => {
    const client = await worker.clients.get(e.clientId);
    if (!e.clientId) {
      console.log('no client id')
      return
    }
    client?.postMessage({
      msg: "Hey I just got a fetch from you!",
    })
  })
})

worker.addEventListener('activate', function (event: any) {
  event.waitUntil((worker as any).clients.claim()); // Become available to all pages
})


/**
 * Spin up the oboku reader streamer.
 * We need to provide our custom function to retrieve the archive.
 * This getter can fetch the epub from internet, indexedDB, etc
 */
worker.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {

    const { epubUrl, epubFileName } = extractInfoFromEvent(event)

    console.warn(epubUrl, epubFileName)
    
    event.respondWith((async () => {
      try {
        const archive = await loadEpub(epubUrl)

        /**
         * Hit to manifest
         */
        if (url.pathname.endsWith(`/manifest`)) {
          return await getManifestFromArchive(archive, { baseUrl: `${url.origin}/${STREAMER_URL_PREFIX}/${epubFileName}` })
        }

        /**
         * Hit to resources
         */
        const resourcePath = getResourcePath(event)

        return await getResourceFromArchive(archive, resourcePath)
      } catch (e) {
        console.error(e)

        return new Response(e.message, { status: 500 })
      }
    })())
  }
});