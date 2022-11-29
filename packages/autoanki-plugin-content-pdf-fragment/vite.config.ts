/*
 * We use vite for storybook
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      /**
       * Required to make @emotion work.
       * See https://dev.to/glocore/configure-emotion-with-your-vite-react-project-7jl
       */
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
});
