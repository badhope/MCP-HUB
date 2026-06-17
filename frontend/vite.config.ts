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
      // NOTE: @vitejs/plugin-react v6 dropped the `babel` option. The dev-only
      // `react-dev-locator` plugin can't be wired in here anymore without a
      // separate babel pipeline; it's a non-essential dev convenience, so we
      // omit it rather than break the type check (`npm run check`).
      react(),
      tsconfigPaths()
    ],
  }
})
