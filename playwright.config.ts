import { defineConfig } from '@playwright/test';

// Local sandboxes without Playwright's own browser can set PW_CHROME to a Chrome binary.
const executablePath = process.env.PW_CHROME;

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173/sorry-zombies/',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/sorry-zombies/',
    reuseExistingServer: !process.env.CI,
  },
});
