// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mopslipper.github.io',
  base: '/7-girl-slide-puzzle',
  trailingSlash: 'ignore',
  build: {
    format: 'file',
  },
});