import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import react from "@vitejs/plugin-react"
import svgr from "vite-plugin-svgr"
import replace from "@rollup/plugin-replace"
import path from "node:path"

export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: true,
    minify: mode !== "development",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      // fix sax on browser
      define: {
        global: "globalThis",
      },
    },
  },
  /**
   * require('events') uses package events which is a web polyfill
   */
  resolve: {
    alias: {
      stream: path.resolve(__dirname, "./stream-shim.js"),
    },
  },
  plugins: [
    VitePWA({
      base: "/",
      minify: false,
      injectRegister: false,
      strategies: "injectManifest",
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      srcDir: "src/serviceWorker",
      filename: "service-worker.ts",
      ...(mode === "development" && {
        devOptions: {
          enabled: true,
        },
      }),
    }),
    react({}),
    svgr({}),
    replace({
      // fix for util/util.js
      "process.env.NODE_DEBUG": false,
      preventAssignment: true,
    }),
  ],
}))
