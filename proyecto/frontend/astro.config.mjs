import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  // Esto es lo nuevo para asegurar que escuche en el puerto correcto
  server: {
    port: process.env.PORT || 10000,
    host: '0.0.0.0' 
  }
});