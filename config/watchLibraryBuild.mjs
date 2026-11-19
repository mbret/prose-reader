/**
 * A package's `start`: Vite's watch build next to `tsc --watch` for the
 * declarations. When either process exits, the other is stopped too, so a
 * failed start never leaves one of them writing into `dist` on its own.
 */
import { spawn } from "node:child_process"

const watchProcesses = [
  ["tsc", ["-p", "tsconfig.build.json", "--watch", "--preserveWatchOutput"]],
  ["vite", ["build", "--watch", "--mode", "development"]],
].map(([command, args]) =>
  spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
)

for (const watchProcess of watchProcesses) {
  watchProcess.on("exit", (code) => {
    process.exitCode = code ?? 1
    for (const other of watchProcesses) {
      if (other !== watchProcess && other.exitCode === null) other.kill()
    }
  })
}
