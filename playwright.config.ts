import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:4173/us-tax/",
  },
  webServer: {
    command: "npm run build && npx vite preview --port 4173",
    port: 4173,
    reuseExistingServer: true,
  },
});
