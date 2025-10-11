import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 120000,
  expect: { timeout: 30000 },
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:5177',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retry-with-video',
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
})