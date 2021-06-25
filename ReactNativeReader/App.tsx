/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from 'react';
import { Server } from './src/Server'
import { ReaderWebView } from './src/ReaderWebView'
import {
  RecoilRoot,
} from 'recoil';

const App = () => {
  return (
    <RecoilRoot>
      <ReaderWebView />
      <Server />
    </RecoilRoot>
  );
};

export default App;
