/**
 * Every `AGENTS.md` must have a sibling `CLAUDE.md` importing it.
 *
 * Claude Code discovers `CLAUDE.md`, not `AGENTS.md`, so guidelines written
 * only in an `AGENTS.md` reach tools that read that name natively and silently
 * miss Claude Code. A one line `CLAUDE.md` next to it keeps both in sync.
 */
import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const IGNORED = new Set(["node_modules", "dist", ".git", ".nx", "build"])

const findAgentDocs = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return IGNORED.has(entry.name) || entry.name.startsWith(".")
        ? []
        : findAgentDocs(join(directory, entry.name))
    }

    return entry.name === "AGENTS.md" ? [directory] : []
  })

const problems = findAgentDocs(ROOT).flatMap((directory) => {
  const location = relative(ROOT, join(directory, "CLAUDE.md")) || "CLAUDE.md"

  let content

  try {
    content = readFileSync(join(directory, "CLAUDE.md"), "utf8")
  } catch {
    return [
      `${location} is missing, so Claude Code will not read its AGENTS.md`,
    ]
  }

  return content.includes("@AGENTS.md")
    ? []
    : [`${location} exists but does not import its AGENTS.md with @AGENTS.md`]
})

if (problems.length) {
  console.error("Agent guideline files are out of sync:\n")
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    "\nAdd a CLAUDE.md next to each AGENTS.md whose body imports it:\n\n  @AGENTS.md\n",
  )
  process.exit(1)
}

console.log(`Checked agent guidelines, every AGENTS.md has a CLAUDE.md.`)
