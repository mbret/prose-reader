import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

export default defineConfig({
  build:{
    rollupOptions: {
      output: {
        dir: path.resolve(__dirname, '../assets'),
      }
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
  plugins: [
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
  ],
});
