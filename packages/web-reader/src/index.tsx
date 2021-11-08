if (process.env.NODE_ENV === `development`) {
  window.__OBOKU_READER_DEBUG = true
}

import ReactDOM from "react-dom";
import React from 'react';
import { App } from "./App";
import { Workbox } from "workbox-window";

const run = () => {
  ReactDOM.render(
    <App />,
    document.getElementById('app')
  )
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const wb = new Workbox(`/service-worker.js`)

    wb.addEventListener('activated', (event) => {

      console.log('activated');

      // `event.isUpdate` will be true if another version of the service
      // worker was controlling the page when this version was registered.
      if (!event.isUpdate) {
        console.log('Service worker activated for the first time!');

        // If your service worker is configured to precache assets, those
        // assets should all be available now.
        // return run()
      }

      console.log('Service worker activated');
      // run()
    });

    wb.addEventListener('controlling', (event) => {
      console.log('Service worker controlling');
      // run()
    });

    wb.addEventListener('waiting', (event) => {
      console.log(`A new service worker has installed, but it can't activate until all tabs running the current version have fully unloaded.`);
    })

    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        console.log('Service worker installed for the first time!');
        // run()
      }
    })

    wb.addEventListener('redundant', (event) => {
      console.log(`redundant`);
    })

    wb.addEventListener('installing', (event) => {
      console.log(`installing`);
    })

    wb.register().then(async () => {
      // const sw = await wb.getSW()
      console.log(`asdasdsa`,)
      wb.active.then((sw) => {
        console.log('Service worker active', sw.state);
        if (sw.state === `activating`) {

        } else {
          // run()
        }
      })

      wb.controlling.then((sw) => {
        console.log('Service worker controlling', sw.state);
        run()
      })
    })

    navigator.serviceWorker.getRegistration().then(function (reg) {
      // There's an active SW, but no controller for this tab.
      if (reg?.active && !navigator.serviceWorker.controller) {
        // Perform a soft reload to load everything from the SW and get
        // a consistent set of resources.
        window.location.reload();
      }
    });
  });
}
