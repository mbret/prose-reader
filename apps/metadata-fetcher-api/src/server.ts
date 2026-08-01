import { configFromEnv } from "./config.ts"
import { createApp } from "./createApp.ts"

/** Environment in, listening server out. Everything else is in `createApp`. */
const config = configFromEnv(process.env)
const app = createApp(config)

const server = app.listen(config.port, () => {
  const providers = config.providers.map((provider) => provider.id).join(", ")

  console.log(
    `metadata-fetcher-api listening on :${config.port} — providers: ${providers || "none"}`,
  )
})

/**
 * Containers stop with SIGTERM: closing lets in-flight lookups finish instead
 * of dying mid-response, and exiting promptly keeps `docker compose down` from
 * waiting out its kill timer.
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
