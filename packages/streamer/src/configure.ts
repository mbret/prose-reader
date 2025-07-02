import { Report } from "./report"

export const configure = ({
  enableReport,
}: {
  enableReport?: boolean
} = {}) => {
  Report.enable(!!enableReport)
}
