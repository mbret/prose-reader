import { memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { HomeScreen } from './home/HomeScreen';
import { BooksScreen } from './books/BooksScreen';
import { ReaderScreen } from './reader/ReaderScreen';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryClientProvider$ } from 'reactjrx';
import { Provider } from './components/ui/provider';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => console.error(error),
  }),
});

export const App = memo(() => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider>
        <QueryClientProvider$>
          <Router>
            <Routes>
              <Route path="/reader/:url" element={<ReaderScreen />} />
              <Route path="/books" element={<BooksScreen />} />
              <Route path="/" element={<HomeScreen />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </QueryClientProvider$>
        <Toaster />
      </Provider>
    </QueryClientProvider>
  );
});
