import { Box, Image, Badge, Flex, Spacer } from '@chakra-ui/react'
import { StarIcon } from '@chakra-ui/icons'
import React from 'react'
import { Link } from 'react-router-dom'

export const Home = () => {
  const property = [
    {
      imageUrl: `${window.location.origin}/haruko-cover.jpg`,
      imageAlt: "",
      link: `/comics/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}`,
      beds: 3,
      baths: 2,
      title: "Manga, horizontal scrolling",
      formattedPrice: "$1,900.00",
      reviewCount: 34,
      rating: 4,
    },
    // {
    //   imageUrl: `${window.location.origin}/haruko-cover.jpg`,
    //   imageAlt: "Rear view of modern home with pool",
    //   link: `/comics/reader/${btoa(`${window.location.origin}/epubs/haruko-comic.zip`)}`,
    //   beds: 3,
    //   baths: 2,
    //   title: "Modern home in city center in the heart of historic Los Angeles",
    //   formattedPrice: "$1,900.00",
    //   reviewCount: 34,
    //   rating: 4,
    // }
  ]

  return (
    <Flex flexDirection="column" alignItems="center">
      {property.map((item, i) => (
        <MangaCard {...item} key={i} />
      ))}
    </Flex>
  )
}

const MangaCard = (props: {
  imageUrl: string,
  link: string,
  imageAlt: string,
  beds: number,
  baths: number,
  title: string,
  formattedPrice: string,
  reviewCount: number,
  rating: number,
}) => {
  return (
    <Box maxW="sm" borderWidth="1px" borderRadius="lg" overflow="hidden" margin={5}>
      <Link to={props.link}>
        <Image src={props.imageUrl} alt={props.imageAlt} height={200} width="100%" objectFit="cover"/>
        <Box p="6">
          <Box d="flex" alignItems="baseline">
            <Badge borderRadius="full" px="2" colorScheme="teal">
              New
            </Badge>
            <Box
              color="gray.500"
              fontWeight="semibold"
              letterSpacing="wide"
              fontSize="xs"
              textTransform="uppercase"
              ml="2"
            >
              {props.beds} readers &bull; {props.baths} tags
            </Box>
          </Box>

          <Box
            mt="1"
            fontWeight="semibold"
            as="h4"
            lineHeight="tight"
            isTruncated
          >
            {props.title}
          </Box>

          {/* <Box>
            {props.formattedPrice}
            <Box as="span" color="gray.600" fontSize="sm">
              / wk
            </Box>
          </Box> */}

          <Box d="flex" mt="2" alignItems="center">
            {Array(5)
              .fill("")
              .map((_, i) => (
                <StarIcon
                  key={i}
                  color={i < props.rating ? "teal.500" : "gray.300"}
                />
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