import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site lives at https://rudik-96.github.io/homeStage-backOffice/
export default defineConfig({
  base: '/homeStage-backOffice/',
  plugins: [react()],
  server: { port: 5174 },
});
