import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import reactPlugin from '@vitejs/plugin-react';
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), reactPlugin()]
  },

  integrations: [react()]
});