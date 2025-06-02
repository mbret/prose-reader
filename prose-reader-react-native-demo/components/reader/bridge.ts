import type { Manifest } from '@prose-reader/shared';
import { postMessageSchema } from '@webview-bridge/react-native';
import type { ProsePostMessageSchema } from '@prose-reader/react-native';

export const appPostMessageSchema = postMessageSchema<ProsePostMessageSchema>({
  load: {
    validate: (data) =>
      data as {
        manifest: Manifest;
      },
  },
  turnRight: {
    validate: () => {},
  },
  turnLeft: {
    validate: () => {},
  },
});
