import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Configuración añadida para permitir formularios cross-site
  security: {
    checkOrigin: false,
  },
});