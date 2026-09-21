import { Link } from "react-router"
import {
  BreadcrumbCurrentLink,
  BreadcrumbLink,
  BreadcrumbRoot,
} from "../../components/ui/breadcrumb"
import { DEMO_BASE_PATH } from "../../constants"

export const NavigationBreadcrumb = () => {
  return (
    <BreadcrumbRoot>
      <BreadcrumbLink asChild>
        <Link to="/">Home</Link>
      </BreadcrumbLink>

      <BreadcrumbLink asChild>
        <Link to={DEMO_BASE_PATH}>Demo</Link>
      </BreadcrumbLink>

      <BreadcrumbCurrentLink asChild>
        <Link to={`${DEMO_BASE_PATH}/books`}>Books</Link>
      </BreadcrumbCurrentLink>
    </BreadcrumbRoot>
  )
}
