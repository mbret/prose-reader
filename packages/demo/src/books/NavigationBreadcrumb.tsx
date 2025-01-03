import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@chakra-ui/react"
import React from "react"
import { Link } from "react-router-dom"

export const NavigationBreadcrumb = () => {
  return (
    <Breadcrumb>
      <BreadcrumbItem>
        <BreadcrumbLink to="/" as={Link}>
          Home
        </BreadcrumbLink>
      </BreadcrumbItem>

      <BreadcrumbItem isCurrentPage>
        <BreadcrumbLink to="/books" as={Link}>
          Books
        </BreadcrumbLink>
      </BreadcrumbItem>
    </Breadcrumb>
  )
}
