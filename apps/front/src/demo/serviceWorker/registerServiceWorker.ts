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

  registering ??= navigator.serviceWorker.register(
    import.meta.env.PROD ||
      /**
       * firefox does not support module type for dev service worker.
       * Please build and copy dist service worker in public when developing with firefox
       */
      navigator.userAgent.includes("Firefox/")
      ? "/service-worker.js"
      : "/dev-sw.js?dev-sw",
    {
      type: import.meta.env.PROD ? "classic" : "module",
    },
  )

  return registering
}
