import { defineConfig } from "cypress";

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
  },
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      // Test environment variables
      TEST_USER_EMAIL: "test@fittrack.ai",
      TEST_USER_PASSWORD: "Test123!@#",
      API_URL: "http://localhost:3001",
      COVERAGE: false,
      // Firebase config for mocking
      VITE_FIREBASE_API_KEY: "mock-api-key",
      VITE_FIREBASE_PROJECT_ID: "fittrackai2026",
      VITE_FIREBASE_AUTH_DOMAIN: "fittrackai2026.firebaseapp.com",
    },
    setupNodeEvents(on, config) {
      // Import Percy plugin
      // on('task', require('@percy/cypress/task'))

      // Custom tasks
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },
        table(message) {
          console.table(message);
          return null;
        },
      });

      return config;
    },
  },
});
