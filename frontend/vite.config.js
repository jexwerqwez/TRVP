import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        assetsDir: 'assets',
        outDir: '../dist',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            '@assets': '/public/assets',
        },
    },
});
