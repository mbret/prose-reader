import { satteri } from "@astrojs/markdown-satteri"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import mermaid from "astro-mermaid"
import starlightLinksValidator from "starlight-links-validator"
import starlightLlmsTxt from "starlight-llms-txt"

export default defineConfig({
  site: "https://doc.prose-reader.com",
  trailingSlash: "never",
  markdown: {
    processor: satteri({
      features: {
        // Prose quotes values a reader copies, such as "auto", so quotes stay straight
        smartPunctuation: false,
        // `{ #id }` keeps the anchor GitBook gave a heading, which published links point to
        headingAttributes: true,
      },
    }),
  },
  integrations: [
    // astro-mermaid has to run before Starlight turns code blocks into Expressive Code
    mermaid({ enableLog: false }),
    starlight({
      title: "prose",
      // The homepage's meta description, and the fallback of any page without one
      description:
        "Guides and API reference for prose, the open-source engine that renders any format, from EPUB, comics and PDF to your own, in the reading apps you build.",
      logo: { src: "./src/assets/logo.svg" },
      // Starlight links /favicon.svg itself; the .ico is the fallback for browsers without SVG favicons
      head: [
        {
          tag: "link",
          attrs: { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
        },
        {
          tag: "link",
          attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        },
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/mbret/prose-reader",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/mbret/prose-reader/edit/master/apps/docs/",
      },
      customCss: ["./src/styles/figures.css"],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
        SocialIcons: "./src/components/SocialIcons.astro",
      },
      routeMiddleware: "./src/routeData.ts",
      plugins: [starlightLinksValidator(), starlightLlmsTxt()],
      sidebar: [
        {
          label: "Get Started",
          items: [
            "index",
            "get-started/demo-and-showcase",
            "get-started/how-to-do-x",
            "get-started/contact-community-links",
            "get-started/getting-started",
            {
              label: "Concepts & Techs",
              items: [
                { label: "Overview", slug: "get-started/concepts-and-techs" },
                "get-started/concepts-and-techs/pagination",
                "get-started/concepts-and-techs/internal-structure",
              ],
            },
            "get-started/troubleshooting-faq",
            "get-started/alternatives",
          ],
        },
        {
          label: "Learn",
          items: [
            "learn/contract",
            {
              label: "Streamer",
              items: [
                { label: "Overview", slug: "learn/streamer" },
                "learn/streamer/api-reference",
                "learn/streamer/node",
                "learn/streamer/react-native",
                "learn/streamer/service-worker",
                "learn/streamer/web-dom",
                "learn/streamer/hooks",
              ],
            },
            "learn/enhancers",
            "learn/viewport",
            "learn/hooks",
            "learn/renderers",
            "learn/pagination",
            "learn/settings",
            "learn/context",
            "learn/navigation",
            "learn/selection",
            "learn/links",
            "learn/zoom",
            "learn/pdf",
            "learn/page-turn-mode",
            "learn/style-and-css",
            "learn/headless-rendering",
            "learn/annotations",
            "learn/bookmarks",
            "learn/book-notes",
            "learn/error-handling",
            "learn/performances",
            "learn/contents-supports",
          ],
        },
        {
          label: "Core API",
          items: [
            "core-api/introduction",
            {
              label: "reader",
              items: [
                { label: "Overview", slug: "core-api/reader" },
                "core-api/reader/keepspineitemloaded",
                "core-api/reader/linksusd",
                "core-api/reader/locateresource",
                "core-api/reader/renderheadless",
              ],
            },
            "core-api/viewport",
            "core-api/navigation",
            "core-api/pagination",
            "core-api/spine",
            "core-api/zoom",
            "core-api/utilities",
          ],
        },
        {
          label: "Enhancers",
          items: [
            "enhancers/pdf",
            "enhancers/gestures",
            "enhancers/gallery",
            "enhancers/search",
            "enhancers/annotations",
            "enhancers/refit",
            "enhancers/audio",
            "enhancers/koreader",
            "enhancers/cbz-and-comics-archives",
          ],
        },
        {
          label: "Archive Reader",
          items: [
            { label: "About", slug: "archive-reader" },
            "archive-reader/resolved-metadata",
            "archive-reader/identifiers",
            "archive-reader/google-books",
            "archive-reader/project-gutenberg",
            "archive-reader/open-library",
            "archive-reader/doi",
          ],
        },
        {
          label: "Metadata Fetcher",
          items: [{ label: "About", slug: "metadata-fetcher" }],
        },
        {
          label: "CFI",
          items: ["cfi"],
        },
        {
          label: "KOReader",
          items: ["koreader", "koreader/document-digests"],
        },
        {
          label: "React Reader",
          items: ["react-reader/introduction", "react-reader/getting-started"],
        },
        {
          label: "React Native",
          items: [
            "react-native/introduction",
            "react-native/getting-started",
            "react-native/prose-reader-react-native",
          ],
        },
      ],
    }),
  ],
})
