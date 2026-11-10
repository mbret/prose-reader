/**
 * The number of pages of `long-comic.cbz`, one spine item each: enough to
 * overflow the call stack of Chromium and Firefox if the layout of each item
 * ran inside the layout of the one before it. WebKit overflows on some runs
 * only, and Chromium alone at 500 pages.
 */
export const LONG_COMIC_NUMBER_OF_PAGES = 1000
