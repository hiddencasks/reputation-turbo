import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Use a preinstalled Chromium when PW_CHROMIUM_PATH is set (e.g. in cloud sandboxes).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // AI checks use built-in sample answers in tests; no real AI service is called.
    env: { AI_CHECK_FAKE: "1", CRON_SECRET: "test-cron-secret" },
    timeout: 60_000,
  },
});
