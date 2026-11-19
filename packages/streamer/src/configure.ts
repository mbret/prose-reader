import { Report } from "./report.ts"

export const configure = ({
  enableReport,
}: {
  enableReport?: boolean
} = {}) => {
  Report.enable(!!enableReport)
}
