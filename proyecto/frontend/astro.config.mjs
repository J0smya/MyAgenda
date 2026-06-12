import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: process.env.SITE ?? process.env.PUBLIC_SITE_URL ?? 'https://myagenda-2.onrender.com',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Configuración de puerto y host para Render
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
  // Configuración para permitir formularios cross-site
  security: {
    checkOrigin: false,
  },
});
