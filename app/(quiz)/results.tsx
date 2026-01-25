import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { questions } from "../../data/questions";

const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";

export default function ResultsScreen() {
  const [highest, setHighest] = useState(0);
  const [last, setLast] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const rawHighest = await AsyncStorage.getItem(STORAGE_KEY_HIGHEST);
        const rawLast = await AsyncStorage.getItem(STORAGE_KEY_LAST);
        const h = rawHighest ? Number(rawHighest) : 0;
        const l = rawLast ? Number(rawLast) : 0;
        if (cancelled) return;
        setHighest(Number.isFinite(h) ? h : 0);
        setLast(Number.isFinite(l) ? l : 0);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Results</Text>

        <Text style={styles.big}>
          {last} / {questions.length}
        </Text>
        <Text style={styles.meta}>
          Highest score achieved: {highest} / {questions.length}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            activeOpacity={0.85}
            onPress={() => router.replace("/(quiz)")}
          >
            <Text style={styles.btnText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={() => router.replace("/(quiz)/quiz")}
          >
            <Text style={styles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Highest score is saved using AsyncStorage on this device.
        </Text>
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
  title: { color: "rgba(255,255,255,0.92)", fontSize: 22, fontWeight: "800" },
  big: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 4,
  },
  meta: { color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: "rgba(124,92,255,0.85)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  btnGhost: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.16)" },
  btnText: { color: "white", fontWeight: "800" },
  hint: { color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 16 },
});

