import { Box, Image, Badge, Flex, Spacer } from "@chakra-ui/react"
import { StarIcon } from "@chakra-ui/icons"
import React from "react"
import { Link } from "react-router-dom"
import { Button as ChakraButton, Text } from "@chakra-ui/react"
import { ArrowBackIcon } from "@chakra-ui/icons"

export const Home = () => {
  const property = [
    {
      imageUrl: `${window.location.origin}/haruko-cover.jpg`,
      imageAlt: "",
      link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}`,
      beds: 3,
      baths: 2,
      title: "Manga, horizontal scrolling",
      formattedPrice: "$1,900.00",
      reviewCount: 34,
      rating: 4
    },
    {
      imageUrl: `${window.location.origin}/haruko-cover.jpg`,
      imageAlt: "",
      link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}?vertical`,
      beds: 3,
      baths: 2,
      title: "Manga, vertical scrolling",
      formattedPrice: "$1,900.00",
      reviewCount: 34,
      rating: 4
    },
    {
      imageUrl: `${window.location.origin}/haruko-cover.jpg`,
      imageAlt: "",
      link: `/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}?free&vertical`,
      beds: 3,
      baths: 2,
      title: "Manga, vertical free scrolling",
      formattedPrice: "$1,900.00",
      reviewCount: 34,
      rating: 4
    },
    {
      imageUrl: `${window.location.origin}/haruko-cover.jpg`,
      imageAlt: "",
      link: `/reader/${btoa(`${window.location.origin}/epubs/rendition-flow-webtoon-one-page.epub`)}?free&vertical`,
      beds: 3,
      baths: 2,
      title: "Webtoon (one big image), vertical free scrolling",
      formattedPrice: "$1,900.00",
      reviewCount: 34,
      rating: 4
    },
    {
      imageUrl: `${window.location.origin}/haruko-cover.jpg`,
      imageAlt: "",
      link: `/reader/${btoa(`${window.location.origin}/epubs/rendition-flow-webtoon.epub`)}?free&vertical`,
      beds: 3,
      baths: 2,
      title: "Webtoon, vertical free scrolling",
      formattedPrice: "$1,900.00",
      reviewCount: 34,
      rating: 4
    }
  ]

  return (
    <div>
      <div
        style={{
          padding: 10
        }}
      >
        <Link to={`/`} style={{ marginBottom: 20 }}>
          <ChakraButton leftIcon={<ArrowBackIcon />}>Back to home</ChakraButton>
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 20 }}>
        {property.map((item, i) => (
          <MangaCard {...item} key={i} />
        ))}
      </div>
    </div>
  )
}

const MangaCard = (props: {
  imageUrl: string
  link: string
  imageAlt: string
  beds: number
  baths: number
  title: string
  formattedPrice: string
  reviewCount: number
  rating: number
}) => {
  return (
    <Box maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden" margin={2} width="100%">
      <Link to={props.link}>
        <Image src={props.imageUrl} alt={props.imageAlt} height={200} width="100%" objectFit="cover" />
        <Box p="6">
          <Box display="flex" alignItems="baseline">
            <Badge borderRadius="full" px="2" colorScheme="teal">
              New
            </Badge>
            <Box color="gray.500" fontWeight="semibold" letterSpacing="wide" fontSize="xs" textTransform="uppercase" ml="2">
              {props.beds} readers &bull; {props.baths} tags
            </Box>
          </Box>
          <Box mt="1" fontWeight="semibold" as="h4" lineHeight="tight" noOfLines={1}>
            {props.title}
          </Box>
          <Box display="flex" mt="2" alignItems="center">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <StarIcon key={i} color={i < props.rating ? "teal.500" : "gray.300"} />
              ))}
            <Box as="span" ml="2" color="gray.600" fontSize="sm">
              {props.reviewCount} reviews
            </Box>
          </Box>
        </Box>
      </Link>
    </Box>
  )
}
