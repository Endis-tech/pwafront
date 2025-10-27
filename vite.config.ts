import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './', // rutas relativas para que React Router funcione
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // actualiza la PWA automáticamente
      manifest: {
        name: 'Todo App',
        short_name: 'Todo',
        description: 'Una aplicación de tareas simples',
        start_url: './', // importante para SPA
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#302269',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' }
        ],
        screenshots: [
          { src: '/screenshots/captura2.png', sizes: '1280x720', type: 'image/png' }
        ]
      },
      devOptions: {
        enabled: true // permite probar PWA en dev
      }
    })
  ],
  build: {
    outDir: 'dist', // Vercel buscará esta carpeta
    sourcemap: false
  }
});
