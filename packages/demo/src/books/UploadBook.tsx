import { Box, Text } from '@chakra-ui/react';
import localforage from 'localforage';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadedBooks } from './useUploadedBooks';

export const UploadBook = () => {
  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'application/vnd.rar': ['.rar', '.cbr'],
      'application/x-rar-compressed': ['.rar', '.cbr'],
      'application/x-rar': ['.rar', '.cbr'],
      'application/octet-stream': ['.rar', '.cbr'],
      'application/epub+zip': ['.epub'],
      'application/zip': ['.cbz', '.epub'],
      'application/x-cbz': ['.cbz'],
    },
    maxFiles: 1,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [lastAddedBook, setLastAddedBook] = useState<string | undefined>();
  const { refetch } = useUploadedBooks();

  useEffect(() => {
    const file = acceptedFiles[0];

    if (file) {
      (async () => {
        setIsUploading(true);
        await localforage.setItem(file.name, file);
        setLastAddedBook(file.name);

        refetch();

        setIsUploading(false);
      })();
    }
  }, [acceptedFiles, refetch]);

  return (
    <Box
      borderWidth={1}
      borderStyle="dashed"
      borderColor="border"
      padding={4}
      marginY={6}
      cursor="pointer"
      {...getRootProps()}
    >
      <input {...getInputProps()} />
      {lastAddedBook && <Text>{lastAddedBook} has been added!</Text>}
      {isUploading ? <Text>Uploading...</Text> : <Text>Click or drag to upload your own book</Text>}
    </Box>
  );
};
