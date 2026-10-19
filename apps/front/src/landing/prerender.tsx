import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import createEmotionServer from "@emotion/server/create-instance"
import { renderToString } from "react-dom/server"
import { Landing } from "./Landing"

/**
 * Renders the landing page for `scripts/prerender-landing.mjs`, which writes it
 * into the built index.html. Emotion collects the styles the page uses, so they
 * ship in the head instead of inline next to each element. The browser's own
 * emotion cache shares the `css` key and picks them up when React hydrates.
 */
export const prerenderLanding = () => {
  const emotionCache = createCache({ key: "css" })
  const emotionServer = createEmotionServer(emotionCache)
  const html = renderToString(
    <CacheProvider value={emotionCache}>
      <Landing />
    </CacheProvider>,
  )
  const styles = emotionServer.constructStyleTagsFromChunks(
    emotionServer.extractCriticalToChunks(html),
  )

  return { html, styles }
}
