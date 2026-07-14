import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks to the API via "/api". In dev we proxy that to the
// Express server on :5000 so there are no CORS surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Dispatch — the agent-recommender chatbot (FastAPI on :8000).
      // "/dispatch/chat" -> "http://localhost:8000/chat"
      '/dispatch': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dispatch/, ''),
      },
    },
  },
});
