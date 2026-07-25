import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	integrations: [react()],
	adapter: cloudflare({
		imageService: 'passthrough',
	}),
	vite: {
		plugins: [tailwindcss()],
		ssr: {
			// Bundle CJS deps so workerd (no require) can run them in dev.
			noExternal: ['picomatch', '@astrojs/internal-helpers'],
		},
		optimizeDeps: {
			include: [
				'picomatch',
				'@astrojs/internal-helpers > picomatch',
				'react',
				'react-dom',
				'react-dom/server',
			],
		},
	},
});
