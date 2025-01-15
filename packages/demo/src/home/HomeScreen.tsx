import { Link } from 'react-router';
import { Text, Box, Heading, Link as ChakraLink, Stack } from '@chakra-ui/react';
import { OrDivider } from '../common/OrDivider';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { Button } from '../components/ui/button';

export const HomeScreen = () => {
  return (
    <Stack height="100%">
      <Stack
        style={{
          width: `100%`,
          margin: `auto`,
          maxWidth: 320,
          alignItems: `center`,
        }}
      >
        <Box position="relative" mb={8}>
          <Heading as="h1" fontFamily="'Dancing Script', sans-serif" size="6xl">
            prose
          </Heading>
          <Text as="span" position="absolute" top="10%" right="-30%" opacity={0.5}>
            demo
          </Text>
        </Box>
        <Box textAlign="justify" maxWidth={[`auto`]} marginX={[4]} mb={4}>
          <Text as="p">
            This demo is a reader made with React and use <b>prose</b> to render its content.
          </Text>
          <Text as="p" mt={4}>
            It provides a simple and generic user interface to showcase what <b>prose</b> can do and
            how it integrates with a reader app.
          </Text>
        </Box>
        <Box mt={4} mb={2} width="100%" paddingX={4}>
          <Button size="lg" width="100%" asChild>
            <Link to={`/books`} style={{ marginBottom: 20 }}>
              Take me in!
            </Link>
          </Button>
        </Box>
        <OrDivider />
        <Box mt={2} width="100%" paddingX={4}>
          <Button size="lg" width="100%" asChild>
            <ChakraLink href="https://prose-reader.com" target="_blank">
              landing page <FaExternalLinkAlt />
            </ChakraLink>
          </Button>
        </Box>
      </Stack>
      <Box as="footer" paddingBottom={8} textAlign="center">
        <Text>
          © Copyright{' '}
          <b>
            <ChakraLink
              href="https://www.linkedin.com/in/maxime-bret/"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              Maxime Bret
            </ChakraLink>
          </b>
        </Text>
      </Box>
    </Stack>
  );
};
