import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' makes the built site work from any GitHub Pages path (username.github.io/repo-name/)
export default defineConfig({ base: './', plugins: [react()] });
