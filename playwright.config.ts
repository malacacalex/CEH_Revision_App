import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4179',
    trace: 'retain-on-failure',
  },
  projects: [
    // PW_CHANNEL=msedge (or chrome) reuses an installed browser instead of the downloaded Chromium.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL } },
  ],
  webServer: {
    command: 'npx vite --port 4179 --strictPort',
    url: 'http://localhost:4179',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
