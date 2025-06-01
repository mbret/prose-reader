import { Text, View } from "react-native"
import { epubsDownloadsDestination, epubsDestination } from '@/components/constants';

/**
 * Initialize the folder where we will store the epubs
 */
if (!epubsDestination.exists) {
  epubsDestination.create();
}

/**
 * Initialize the folder where we will store the downloaded epubs
 */
if (!epubsDownloadsDestination.exists) {
  epubsDownloadsDestination.create();
}

export default function HomeScreen() {
  return (
    <View>
      <Text>Hello</Text>
    </View>
  )
}
