// Dev app for the component preview (polaris-ui/preview/). Run: npm run preview -- --port 5320 --strictPort
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here("./preview"),
  plugins: [react(), tailwindcss()],
  server: {
    // The library source (../src) and the gallery's self-hosted fonts sit outside the preview root.
    fs: { allow: [here("."), here("../free-app-gallery/public/fonts")] },
  },
});
