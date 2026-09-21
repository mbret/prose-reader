export const SERVICE_WORKER_SUPPORTED =
  typeof navigator !== "undefined" && "serviceWorker" in navigator

let registering: Promise<ServiceWorkerRegistration> | undefined

/**
 * The demo streams its books through the service worker, therefore we only
 * register it once the user enters the demo. Registration is idempotent, the
 * first call wins.
 */
export const registerServiceWorker = () => {
  if (!SERVICE_WORKER_SUPPORTED) {
    return Promise.reject(
      new Error(`This browser does not support service workers`),
    )
  }

  /**
   * firefox does not support module type for dev service worker, so it reads
   * the built classic worker instead. Please build and copy dist service
   * worker in public when developing with firefox.
   */
  const useBuiltWorker =
    import.meta.env.PROD || navigator.userAgent.includes("Firefox/")

  registering ??= navigator.serviceWorker
    .register(useBuiltWorker ? "/service-worker.js" : "/dev-sw.js?dev-sw", {
      type: useBuiltWorker ? "classic" : "module",
    })
    .catch((error: unknown) => {
      /**
       * Only a successful registration is worth keeping: caching the rejection
       * would make every later visit to the demo replay it instead of retrying.
       */
      registering = undefined

      throw error
    })

  return registering
}
