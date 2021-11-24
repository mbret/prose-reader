import { loadEpub } from './loadEpub';
import { getResourceFromArchive, getManifestFromArchive, Report } from '@prose-reader/core-streamer'
import { STREAMER_URL_PREFIX } from './constants';
import { extractInfoFromEvent, getResourcePath } from './utils';

// @todo typing
const worker: any = self as any;

Report.enable(process.env.NODE_ENV === `development`)

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
 * Spin up the prose reader streamer.
 * We need to provide our custom function to retrieve the archive.
 * This getter can fetch the epub from internet, indexedDB, etc
 */
worker.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {

    const { epubUrl, epubLocation } = extractInfoFromEvent(event)

    event.respondWith((async () => {
      try {
        const archive = await loadEpub(epubUrl)
        // const archive = await createArchiveFromUrls([
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/w397eahqqllui7krx3fky3tl1620298360788.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/lczidu4d5xn4ownxcbbw9m9u1620298362587.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/m9web1lw9axaja37t17xp1241620298363649.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/92xzqad66246tkr0h35n7ubl1620298364651.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/zq3gww3zd077y04ds79bpo371620298366071.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/u5eate6i0nmrwne9xrk71u4r1620298366914.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/z0zsriyaudfcw6v3bqjcf0ex1620298368258.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/ofx8h8hyf0yony29yerzy6721620298369130.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/ijl7d3gzlpnuos9pw7f5lchu1620298370476.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/wx9k3n90cs9yivqlx02rbgkb1620298372762.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/uo6dqk07egw1bkf6e7dgwx6q1620298373585.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/ymy04ggror4t4b0eja0k9zmu1620298374865.jpg`,
        //   `https://cdn.epico.ink/public/VD23LA/en/ZUWT2D/ylqdentbi6qk6vt6sql1bidb1620298375961.jpg`,
        // ])
        // const archive = await createArchiveFromUrls([
        //   'https://cdn.epico.ink/public/H2QLL0/en/AFFL2T/hsci3yij10bg3bi6qy1s6grk1625665869337.png'
        // ])
        const baseUrl = `${url.origin}/${STREAMER_URL_PREFIX}/${epubLocation}`
        // const baseUrl = ``
        // console.log(archive)

        /**
         * Hit to manifest
         */
        if (url.pathname.endsWith(`/manifest`)) {
          return await getManifestFromArchive(archive, { baseUrl })
        }

        /**
         * Hit to resources
         */
        const resourcePath = getResourcePath(event)

        return await getResourceFromArchive(archive, resourcePath)
      } catch (e: any) {
        console.error(e)

        return new Response((e as any).message, { status: 500 })
      }
    })())
  }
});