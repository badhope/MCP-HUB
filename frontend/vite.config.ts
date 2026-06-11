import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

const REPO_NAME = 'MCP-HUB'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const explicitBase = env.VITE_BASE_PATH?.replace(/\/$/, '')
  const base = explicitBase
    ? `/${explicitBase}/`
    : `/${REPO_NAME}/`

  return {
    base,
    build: {
      sourcemap: 'hidden',
      outDir: 'dist',
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1024,
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    plugins: [
      // @vitejs/plugin-react v6 dropped Babel entirely (it now uses
      // oxc for the JSX transform and exposes no `plugins` option).
      // `babel-plugin-react-dev-locator` was a dev-only "click a
      // component in the browser to jump to its source" nicety — not
      // worth rebuilding a Babel pipeline for. Drop it; the rest of the
      // toolchain (vite-tsconfig-paths) is unaffected.
      react(),
      tsconfigPaths()
    ],
  }
})
