import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>This route does not exist.</Text>

        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={() => router.replace("/(quiz)")}>
          <Text style={styles.btnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, justifyContent: "center" },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  title: { color: "rgba(255,255,255,0.95)", fontSize: 40, fontWeight: "900" },
  subtitle: { color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 18 },
  btn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(124,92,255,0.85)",
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "800" },
});

