import { StyleSheet, Text, View } from "react-native";

export default function ProgressScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>İlerlemen</Text>
      <Text style={styles.description}>İlerleme ekranı yakında burada olacak.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8F8F5",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#171A18",
  },
  description: {
    marginTop: 8,
    color: "#747774",
    fontSize: 14,
    textAlign: "center",
  },
});
