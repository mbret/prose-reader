import { Box, IconButton } from '@chakra-ui/react';
import { CiBookmarkCheck } from 'react-icons/ci';

export const BookmarkAddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Box p={2} data-bookmark-area>
      <IconButton aria-label="bookmark" onClick={onClick}>
        <CiBookmarkCheck />
      </IconButton>
    </Box>
  );
};
