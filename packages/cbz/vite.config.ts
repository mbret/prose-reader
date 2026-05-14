import { defineLibConfig } from "../../config/vite-lib"
import { name } from "./package.json"

export default defineLibConfig({
  packageDir: __dirname,
  packageName: name,
})
