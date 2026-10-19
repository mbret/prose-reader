import path from "node:path"
import babel from "@rolldown/plugin-babel"
import replace from "@rollup/plugin-replace"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { type Connect, defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import svgr from "vite-plugin-svgr"
import { DEMO_BASE_PATH } from "./src/constants.ts"

/**
 * The app is two pages: the landing page, index.html, and the demo,
 * demo.html, which answers every path under `DEMO_BASE_PATH`. vercel.json
 * routes them the same way in production.
 */
const serveDemoPage = (): Plugin => {
  const rewriteDemoNavigation: Connect.NextHandleFunction = (
    request,
    _response,
    next,
  ) => {
    const pathname = request.url?.split("?")[0] ?? "/"
    const isDemoPath =
      pathname === DEMO_BASE_PATH || pathname.startsWith(`${DEMO_BASE_PATH}/`)

    if (isDemoPath && request.headers.accept?.includes("text/html")) {
      request.url = "/demo.html"
    }

    next()
  }

  return {
    name: "prose-reader-front:serve-demo-page",
    configureServer: (server) => {
      server.middlewares.use(rewriteDemoNavigation)
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(rewriteDemoNavigation)
    },
  }
}

export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: true,
    minify: mode !== "development",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
        demo: "demo.html",
      },
    },
  },
  /**
   * require('events') uses package events which is a web polyfill
   */
  resolve: {
    alias: {
      stream: path.resolve(import.meta.dirname, "./stream-shim.js"),
    },
  },
  plugins: [
    serveDemoPage(),
    /**
     * The service worker streams the demo books. It is registered at the root
     * scope so that its `/streamer` routes stay reachable from the `/demo`
     * pages.
     */
    VitePWA({
      base: "/",
      minify: false,
      injectRegister: false,
      strategies: "injectManifest",
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      srcDir: "src/demo/serviceWorker",
      filename: "service-worker.ts",
      ...(mode === "development" && {
        devOptions: {
          enabled: true,
        },
      }),
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    svgr({}),
    replace({
      // fix for util/util.js
      "process.env.NODE_DEBUG": false,
      preventAssignment: true,
    }) as Plugin,
  ],
}))
