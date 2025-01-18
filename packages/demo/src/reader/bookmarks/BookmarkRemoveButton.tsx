import { Box, IconButton } from '@chakra-ui/react';
import { CiBookmarkRemove } from 'react-icons/ci';

export const BookmarkRemoveButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Box p={2} data-bookmark-area>
      <IconButton aria-label="bookmark" onClick={onClick} variant="surface">
        <CiBookmarkRemove />
      </IconButton>
    </Box>
  );
};
