'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';
import system from '../../theme/theme';

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider enableColorScheme={false} forcedTheme="dark" {...props} />
    </ChakraProvider>
  );
}
