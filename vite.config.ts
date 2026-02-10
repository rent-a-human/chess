import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const isMobile = env.VITE_MOBILE === 'true';
  const base = isMobile ? './' : '/chess/';

  return {
    plugins: [react()],
    base: base,
    resolve: {
      dedupe: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
    },
    server: {
      proxy: {
        '/gemini-api': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gemini-api/, ''),
        },
        '/claude-api': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/claude-api/, ''),
        },
      },
    },
  };
})
