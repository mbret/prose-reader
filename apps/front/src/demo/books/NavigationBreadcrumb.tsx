import { Link } from "react-router"
import { DEMO_BASE_PATH } from "../../constants"
import {
  BreadcrumbCurrentLink,
  BreadcrumbLink,
  BreadcrumbRoot,
} from "../components/ui/breadcrumb"

export const NavigationBreadcrumb = () => {
  return (
    <BreadcrumbRoot>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>

      <BreadcrumbLink asChild>
        <Link to={DEMO_BASE_PATH}>Demo</Link>
      </BreadcrumbLink>

      <BreadcrumbCurrentLink asChild>
        <Link to={`${DEMO_BASE_PATH}/books`}>Books</Link>
      </BreadcrumbCurrentLink>
    </BreadcrumbRoot>
  )
}
