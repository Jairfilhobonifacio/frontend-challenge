import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.KRONOS_E2E_BASE_URL || 'http://localhost:5273';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    ...(process.env.KRONOS_E2E_LOW_MEMORY === '1' ? { launchOptions: { args: ['--disable-gpu', '--disable-software-rasterizer', '--renderer-process-limit=1', '--js-flags=--max-old-space-size=128'] } } : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'Desktop Chromium (1440px)',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: 'Mobile Chromium (390px)',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 }
      }
    }
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --port 5273 --strictPort',
    url: 'http://localhost:5273',
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});
