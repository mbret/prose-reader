import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(__dirname, "..")

const runFile = (fileName) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, fileName)], {
      cwd: packageDir,
      stdio: "inherit",
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Check ${fileName} failed with exit code ${code}`))
    })
  })

try {
  await runFile("check-enhancer-imports.mjs")
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message)
  }

  process.exitCode = 1
}
