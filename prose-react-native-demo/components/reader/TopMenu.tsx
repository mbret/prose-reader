import { useReaderState } from "@prose-reader/react-native"
import { SafeAreaView, StyleSheet, Text } from "react-native"

export const TopMenu = () => {
  const manifest = useReaderState((state) => state.context?.manifest)

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{manifest?.title}</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "red",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 12,
    padding: 10,
  },
})
