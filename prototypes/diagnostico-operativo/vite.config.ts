import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const configuredBase = loadEnv(mode, ".", "").VITE_BASE_PATH?.trim();
  const base = configuredBase
    ? configuredBase === "/" ? "/" : `/${configuredBase.replace(/^\/+|\/+$/g, "")}/`
    : "./";

  return {
  base,
  define: {
    __APP_VERSION__: JSON.stringify("1.0.0")
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Proyecto B · Diagnóstico Operativo de Campo",
        short_name: "Diagnóstico B",
        description: "Diagnóstico operativo offline-first para trabajo de campo.",
        theme_color: "#123b2d",
        background_color: "#f4f1e8",
        display: "standalone",
        id: base,
        start_url: base,
        scope: base,
        lang: "es-MX",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true
      },
      devOptions: { enabled: true }
    })
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
  };
});
