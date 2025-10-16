import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = process.env.PROJECT_ROOT || __dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    port: 5000,
    proxy: {
      '/me': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/link': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/wallet': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/healthz': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/api/lotto': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  }
});
