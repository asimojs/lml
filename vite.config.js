// vite.config.js
import { resolve } from 'path';
import preact from "@preact/preset-vite";
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [preact()],
    test: {
        environment: 'jsdom'
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'lib/index.js'),
            name: 'lml',
            fileName: 'lml',
        },
        rollupOptions: {

        },
    }
})

