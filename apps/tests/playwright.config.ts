import { availableParallelism } from "node:os"
import {
  defineConfig,
  devices,
  type PlaywrightTestProject,
} from "@playwright/test"
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

type BrowserProfile = { name: string; use: PlaywrightTestProject["use"] }

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
 * profile: `text-Mobile-Chrome-linux.png`.
 */
const createProfileProject = (
  profile: BrowserProfile,
  resourceLoading: ResourceLoading,
): PlaywrightTestProject => ({
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
 * Every profile loads its books over http, and the desktop ones load them
 * from blobs too. Running the mobile profiles both ways as well would make
 * the suite about a fifth longer.
 */
const ALL_PROJECTS: PlaywrightTestProject[] = [
  ...[...DESKTOP_PROFILES, ...MOBILE_PROFILES].map((profile) =>
    createProfileProject(profile, "http"),
  ),
  ...DESKTOP_PROFILES.map((profile) => createProfileProject(profile, "blob")),
]

/**
 * `BROWSER_ENGINE` (`chromium`, `firefox` or `webkit`) keeps the projects
 * whose device runs on that engine, as the two CI jobs of an engine do
 * together. Unset, every project runs.
 */
const BROWSER_ENGINE_TO_RUN = process.env.BROWSER_ENGINE

const PROJECTS_TO_RUN = ALL_PROJECTS.filter(
  (project) =>
    BROWSER_ENGINE_TO_RUN === undefined ||
    project.use?.defaultBrowserType === BROWSER_ENGINE_TO_RUN,
)

if (PROJECTS_TO_RUN.length === 0) {
  throw new Error(
    `BROWSER_ENGINE=${BROWSER_ENGINE_TO_RUN} matches no project: use chromium, firefox or webkit`,
  )
}

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
   * On CI, one core stays free for the Vite dev server and the test runner,
   * which keeps the screenshot tests stable under load: 3 workers on a Linux
   * runner's 4 cores, 2 on a macOS runner's 3.
   */
  workers: process.env.CI ? Math.max(1, availableParallelism() - 1) : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  projects: PROJECTS_TO_RUN,

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm run dev",
    url: `${TEST_APP_ORIGIN}/`,
    reuseExistingServer: !process.env.CI,
  },
})
