import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Configuración de puerto y host para Render
  server: {
    host: '0.0.0.0',
    port: 10000,
  },
  // Configuración para permitir formularios cross-site
  security: {
    checkOrigin: false,
  },
});