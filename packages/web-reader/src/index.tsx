if (process.env.NODE_ENV === `development`) {
  window.__PROSE_READER_DEBUG = true
}

import ReactDOM from "react-dom";
import React from 'react';
import { App } from "./App";

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', {})
      .then(registration => {
        console.log('SW registered: ', registration);
        ReactDOM.render(
          <App />,
          document.getElementById('app')
        )
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else {
  alert(`Unable to install service worker`)
}
