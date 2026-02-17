import { defineConfig } from 'vite';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
    publicDir: 'assets',
    server: {
        port: 3000,
        host: '0.0.0.0',
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                admin: resolve(__dirname, 'admin.html')
            }
        }
    },
    resolve: {
        alias: {
            '@': '/src'
        }
    },
    optimizeDeps: {
        include: ['phaser', 'socket.io-client', 'ethers']
    }
});
