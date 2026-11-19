// Vite's entry for `dist/index.js` and `dist/index.css`. The package
// stylesheet is imported here, not in `index.ts`: Vite moves it into
// `dist/index.css`, but `tsc` would keep the import in the declarations,
// which then declare a side effect the JavaScript does not have.
import "./index.css"

export * from "./index.ts"
