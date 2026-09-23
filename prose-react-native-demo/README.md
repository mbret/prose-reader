# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Build the libraries, from the repository root. The demo depends on them through `file:` links to their build output.

   ```bash
   pnpm install --frozen-lockfile
   pnpm exec lerna run build --stream --scope "@prose-reader/*"
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Build the app and launch it on a simulator, an emulator or a device

   ```bash
   npm run ios
   # or
   npm run android
   ```

   The demo uses a native module Expo Go does not ship (`react-native-zip-archive`), so it runs as a [development build](https://docs.expo.dev/develop/development-builds/introduction/) rather than in Expo Go. Once the app is installed, `npm start` is enough to serve it the JavaScript.

The reader runs inside a WebView whose page is built from the vite app in `web/`, into `web/dist/index.html`. That page is not committed: `npm start` builds it before starting Metro, and so do `npm run start:all`, `npm run ios`, `npm run android` and `npm run bundle`. `npm run start:all` also rebuilds it whenever its sources in `web/` change. Running `npx expo start` directly skips that build, and Metro fails with "Unable to resolve" until the page exists.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Native projects

`ios/` and `android/` are [`expo prebuild`](https://docs.expo.dev/workflow/continuous-native-generation/) output, generated from `app.json` and the installed packages. `npm run ios` and `npm run android` build them as they are and never regenerate them, so after changing `app.json` or upgrading the Expo SDK, regenerate both and commit the result:

```bash
npx expo prebuild --clean
```

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
