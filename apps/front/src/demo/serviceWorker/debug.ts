/**
 * Must be evaluated before any @prose-reader module: their `Report` instances
 * snapshot the flag when they load. Keep this as the first import of the
 * service worker entry.
 */
globalThis.__PROSE_READER_DEBUG = !import.meta.env.PROD

export {}
