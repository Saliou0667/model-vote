import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_FIREBASE_API_KEY: "test-key",
      VITE_FIREBASE_AUTH_DOMAIN: "demo-model-vote.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "demo-model-vote",
      VITE_FIREBASE_STORAGE_BUCKET: "demo-model-vote.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
      VITE_FIREBASE_APP_ID: "1:1234567890:web:1234567890abcdef",
      VITE_ENV: "test",
      VITE_USE_EMULATORS: "true",
    },
  },
});
