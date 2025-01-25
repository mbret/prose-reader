import {
  BreadcrumbCurrentLink,
  BreadcrumbLink,
  BreadcrumbRoot,
} from "../components/ui/breadcrumb"
import { Link } from "react-router"

export const NavigationBreadcrumb = () => {
  return (
    <BreadcrumbRoot>
      <BreadcrumbLink asChild>
        <Link to="/">Home</Link>
      </BreadcrumbLink>

      <BreadcrumbCurrentLink asChild>
        <Link to="/books">Books</Link>
      </BreadcrumbCurrentLink>
    </BreadcrumbRoot>
  )
}
