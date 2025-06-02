import {  SafeAreaView, StyleSheet, Text } from 'react-native';
import { useManifest } from './ReaderProvider';

export const TopMenu = () => {
  const manifest = useManifest();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{manifest?.title}</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    padding: 10,
  },
});
