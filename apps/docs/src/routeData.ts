import { getCollection } from "astro:content"
import { defineRouteMiddleware } from "@astrojs/starlight/route-data"

const docsEntryIdsWithSocialCard = new Set(
  (await getCollection("docs")).map((docsEntry) => docsEntry.id),
)

/**
 * Names the documentation in search results, on the homepage only, where
 * search engines read the name of a site.
 */
const docsWebSiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://doc.prose-reader.com/",
  name: "prose docs",
  alternateName: ["prose documentation", "prose-reader documentation"],
  inLanguage: "en",
}

export const onRequest = defineRouteMiddleware((context) => {
  const { entry, head } = context.locals.starlightRoute
  // Starlight's route data gives the homepage the id "", its collection entry is "index"
  const docsEntryId = entry.id === "" ? "index" : entry.id

  if (docsEntryId === "index") {
    head.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      content: JSON.stringify(docsWebSiteStructuredData),
    })
  }

  if (!docsEntryIdsWithSocialCard.has(docsEntryId)) return

  const socialCardUrl = new URL(`/og/${docsEntryId}.png`, context.site).href
  const socialCardAlt = `${entry.data.title}, in the prose documentation`

  head.push(
    { tag: "meta", attrs: { property: "og:image", content: socialCardUrl } },
    // astro-og-canvas renders every card at 1200 × 630
    { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
    { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
    {
      tag: "meta",
      attrs: { property: "og:image:alt", content: socialCardAlt },
    },
    { tag: "meta", attrs: { name: "twitter:image", content: socialCardUrl } },
    {
      tag: "meta",
      attrs: { name: "twitter:image:alt", content: socialCardAlt },
    },
  )
})
