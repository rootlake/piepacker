import { defineConfig } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Set base path for GitHub Pages only during build, otherwise use root for dev
  const base = command === 'build' ? '/piepacker/' : '/';

  return {
    base: base,
    plugins: [
      qrcode()
    ],
    build: {
      outDir: 'dist',
    },
    // Add server config if needed, e.g., for host or port
    server: {
      host: true,
    //   port: 3000, 
    }
  }
}); 