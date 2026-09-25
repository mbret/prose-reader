/**
 * Guidelines and skills must reach every agent, Claude Code included.
 *
 * - Every `AGENTS.md` must have a sibling `CLAUDE.md` importing it. Claude
 *   Code discovers `CLAUDE.md`, not `AGENTS.md`, so guidelines written only in
 *   an `AGENTS.md` reach tools that read that name natively and silently miss
 *   Claude Code. A one line `CLAUDE.md` next to it keeps both in sync.
 * - Every skill lives in `.agents/skills/`, which most agents read, and has a
 *   symlink in `.claude/skills/`, the only place Claude Code reads. A skill
 *   in one of the two only reaches the agents that read that one.
 */
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const IGNORED = new Set(["node_modules", "dist", ".git", ".nx", "build"])
const SHARED_SKILLS = join(ROOT, ".agents", "skills")
const CLAUDE_CODE_SKILLS = join(ROOT, ".claude", "skills")

const findAgentDocs = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return IGNORED.has(entry.name) || entry.name.startsWith(".")
        ? []
        : findAgentDocs(join(directory, entry.name))
    }

    return entry.name === "AGENTS.md" ? [directory] : []
  })

const agentDocsProblems = findAgentDocs(ROOT).flatMap((directory) => {
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

const listSkillNames = (directory) =>
  existsSync(directory)
    ? readdirSync(directory).filter((name) => !name.startsWith("."))
    : []

const sharedSkillProblems = listSkillNames(SHARED_SKILLS)
  .filter((name) => !existsSync(join(CLAUDE_CODE_SKILLS, name)))
  .map(
    (name) =>
      `.claude/skills/${name} is missing, so Claude Code will not see the ${name} skill`,
  )

const claudeCodeSkillProblems = listSkillNames(CLAUDE_CODE_SKILLS).flatMap(
  (name) => {
    const claudeCodeSkill = join(CLAUDE_CODE_SKILLS, name)
    const sharedSkill = join(SHARED_SKILLS, name)
    const location = relative(ROOT, claudeCodeSkill)

    const isLinkToSharedSkill =
      lstatSync(claudeCodeSkill).isSymbolicLink() &&
      existsSync(sharedSkill) &&
      realpathSync(claudeCodeSkill) === realpathSync(sharedSkill)

    return isLinkToSharedSkill
      ? []
      : [
          `${location} is not a symlink to .agents/skills/${name}, so agents other than Claude Code will not see it`,
        ]
  },
)

const problems = [
  ...agentDocsProblems,
  ...sharedSkillProblems,
  ...claudeCodeSkillProblems,
]

if (problems.length) {
  console.error("Agent guideline files are out of sync:\n")
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(
    [
      "",
      "Add a CLAUDE.md next to each AGENTS.md whose body imports it:",
      "",
      "  @AGENTS.md",
      "",
      "Keep each skill in .agents/skills/<name>, and link it for Claude Code:",
      "",
      "  ln -s ../../.agents/skills/<name> .claude/skills/<name>",
      "",
    ].join("\n"),
  )
  process.exit(1)
}

console.log(
  `Checked agent guidelines: every AGENTS.md has a CLAUDE.md, and every skill is in .agents/skills with a symlink in .claude/skills.`,
)
