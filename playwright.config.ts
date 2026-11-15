import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.PW_PREVIEW
      ? "http://127.0.0.1:4173"
      : "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chromium" } },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: [
    {
      command: process.env.PW_PREVIEW ? "npm run preview" : "npm run dev",
      url: process.env.PW_PREVIEW
        ? "http://127.0.0.1:4173"
        : "http://127.0.0.1:5173",
      reuseExistingServer: true,
    },
    {
      command:
        "DATABASE_PATH=.cache/e2e-snapshots.sqlite PUBLISH_LIMIT=10000 npm run dev:api",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: true,
    },
  ],
});
