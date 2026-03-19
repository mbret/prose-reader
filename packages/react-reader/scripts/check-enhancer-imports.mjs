import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(__dirname, "..")
const targetDir = path.join(packageDir, "src")
const enhancerPackagePattern = /^@prose-reader\/enhancer-/

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, {
    withFileTypes: true,
  })
  const nestedPaths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath)
      }

      if (!entry.isFile()) return []

      return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : []
    }),
  )

  return nestedPaths.flat()
}

const formatLocation = (sourceFile, start) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(start)

  return `${line + 1}:${character + 1}`
}

const main = async () => {
  const files = await collectSourceFiles(targetDir)
  const violations = []

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8")
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) continue

      const moduleSpecifier = statement.moduleSpecifier

      if (!ts.isStringLiteral(moduleSpecifier)) continue

      const importSource = moduleSpecifier.text

      if (!enhancerPackagePattern.test(importSource)) continue

      const importClause = statement.importClause

      if (importClause?.isTypeOnly) continue

      const relativePath = path.relative(packageDir, filePath)

      violations.push({
        importSource,
        location: formatLocation(sourceFile, statement.getStart(sourceFile)),
        relativePath,
      })
    }
  }

  if (violations.length === 0) {
    console.log("No invalid enhancer imports found in react-reader/src.")
    return
  }

  console.error(
    "Found non-type imports from enhancer packages in react-reader/src:",
  )

  for (const violation of violations) {
    console.error(
      `- ${violation.relativePath}:${violation.location} imports ${violation.importSource}`,
    )
  }

  console.error(
    "\nUse `import type` for enhancer packages, or access runtime behavior through the reader instance.",
  )
  process.exitCode = 1
}

await main()
