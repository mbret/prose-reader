import { defineConfig, devices, type Project } from "@playwright/test"
import {
  createResourceLoadingStorageState,
  type ResourceLoading,
} from "./tests/utils/resourceLoading"

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

const TEST_APP_ORIGIN = "http://localhost:3333"

type BrowserProfile = { name: string; use: Project["use"] }

const DESKTOP_PROFILES: BrowserProfile[] = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
]

const MOBILE_PROFILES: BrowserProfile[] = [
  { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
  { name: "Mobile Safari", use: { ...devices["iPhone 12"] } },
]

/**
 * A project running every spec in a browser profile, with each scenario
 * loading its book the given way (see `tests/utils/resourceLoading.ts`). The
 * project loading over http is named after the profile, the other one after
 * both, as `chromium-blob`.
 *
 * A book renders the same however it is loaded, so the projects of a profile
 * compare their screenshots against the same baselines, named after the
 * profile: `text-Mobile-Chrome-darwin.png`.
 */
const createProfileProject = (
  profile: BrowserProfile,
  resourceLoading: ResourceLoading,
): Project => ({
  name:
    resourceLoading === "http"
      ? profile.name
      : `${profile.name}-${resourceLoading}`,
  metadata: { resourceLoading },
  snapshotPathTemplate: `{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-${profile.name.replace(/ /g, "-")}{-snapshotSuffix}{ext}`,
  use: {
    ...profile.use,
    storageState: createResourceLoadingStorageState(
      TEST_APP_ORIGIN,
      resourceLoading,
    ),
  },
})

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /*
   * The CI runner (macos-latest) has 3 cores, so Playwright's "50%" default
   * floors to a single worker. Pin an explicit count instead: 2 workers give
   * real parallelism while leaving a core for the Vite dev server + the
   * orchestrator, keeping the screenshot tests stable under load.
   */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /*
   * Every profile loads its books over http, and the desktop ones load them
   * from blobs too. Running the mobile profiles both ways as well would make
   * the suite too long for CI's few macOS runners.
   */
  projects: [
    ...[...DESKTOP_PROFILES, ...MOBILE_PROFILES].map((profile) =>
      createProfileProject(profile, "http"),
    ),
    ...DESKTOP_PROFILES.map((profile) => createProfileProject(profile, "blob")),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm run dev",
    url: `${TEST_APP_ORIGIN}/`,
    reuseExistingServer: !process.env.CI,
  },
})
