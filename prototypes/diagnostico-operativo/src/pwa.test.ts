import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("contrato PWA offline", () => {
  it("mantiene manifest, service worker, fallback y precache de HTML, JS y CSS", () => {
    const config = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
    expect(config).toContain("VitePWA");
    expect(config).toContain("manifest:");
    expect(config).toContain('globPatterns: ["**/*.{js,css,html}"]');
    expect(config).toContain('navigateFallback: "index.html"');
    expect(config).toContain('registerType: "autoUpdate"');
  });
});
