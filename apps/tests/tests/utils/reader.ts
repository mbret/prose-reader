import type { JSHandle, Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

/**
 * The reader a scenario's `index.tsx` exposes as `window.reader`, once it
 * does, as a handle to evaluate against: a page function given to its
 * `evaluate` receives the reader, typed, as its first argument. A scenario
 * whose reader carries enhancers names its type, such as
 * `getReader<AudioEnhancedReader>(page)`. The handle lives as long as the
 * page's document: get it again after a navigation or a reload.
 *
 * ```ts
 * const reader = await getReader(page)
 *
 * await reader.evaluate((reader, indexOrId) => {
 *   reader.navigation.goToSpineItem({ indexOrId })
 * }, 2)
 * ```
 */
export const getReader = <ScenarioReader extends Reader = Reader>(
  page: Page,
): Promise<JSHandle<ScenarioReader>> =>
  page.waitForFunction(
    // The page's window is untyped: the scenario's index.tsx sets its reader,
    // which this waits for.
    () => (window as unknown as { reader: ScenarioReader }).reader,
  )
