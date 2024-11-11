import { defineConfig } from "vite"
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    build: {
      minify: false,
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
    server: {
      port: 3333
    },
    plugins: [react()],
  }
})
