import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        host: true,
        open: true
    },
    build: {
        outDir: 'dist',
        sourcemap: true
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
