import { useReader, useReaderState } from "@prose-reader/react-native"
import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native"

export const BottomMenu = () => {
  const reader = useReader()
  const pagination = useReaderState((state) => state.pagination)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.buttons}>
        <Button title="<" onPress={() => reader.turnLeft()} />
        <Text>
          {pagination?.beginAbsolutePageIndex} /{" "}
          {pagination?.numberOfTotalPages}
        </Text>
        <Button title=">" onPress={() => reader.turnRight()} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
  },
  buttons: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "blue",
  },
})
