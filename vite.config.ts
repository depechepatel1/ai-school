import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Cache JS/CSS/HTML produced by Vite
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        // Runtime caching for API calls & dynamic assets
        runtimeCaching: [
          {
            // Cache JSON data files
            urlPattern: /\/data\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "data-cache", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 } },
          },
          {
            // Cache images & videos from storage (including ?v=N cache-bust params)
            urlPattern: /\.(?:png|jpg|jpeg|webp|gif|mp4)(\?.*)?$/i,
            handler: "CacheFirst",
            options: { cacheName: "media-cache", expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
        // Never cache OAuth redirects
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        name: "IELTS Speaking Studio",
        short_name: "SpeakStudio",
        description: "AI-powered English language practice",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
