import { configFromEnv } from "./config.ts"
import { createApp } from "./createApp.ts"

/**
 * Entry point: environment in, listening server out. Everything else lives in
 * `createApp`, which takes its configuration as an argument — so the app can
 * be exercised with stub providers without a port or an env var in sight.
 */
const config = configFromEnv(process.env)
const app = createApp(config)

const server = app.listen(config.port, () => {
  const providers = config.providers.map((provider) => provider.id).join(", ")

  console.log(
    `metadata-fetcher-api listening on :${config.port} — providers: ${providers || "none"}`,
  )
})

/**
 * Containers are stopped with SIGTERM: closing the server lets in-flight
 * lookups finish instead of dying mid-response, and exiting promptly keeps
 * `docker compose down` from waiting out its 10s kill timer.
 */
const shutdown = (signal: string): void => {
  console.log(`metadata-fetcher-api: ${signal} received, shutting down`)

  server.close((error) => {
    if (error) {
      console.error("metadata-fetcher-api: error while closing", error)
      process.exit(1)
    }

    process.exit(0)
  })

  // a hung connection must not hold the container hostage
  setTimeout(() => process.exit(1), 5_000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
