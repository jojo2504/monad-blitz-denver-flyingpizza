import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        host: '0.0.0.0',
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
