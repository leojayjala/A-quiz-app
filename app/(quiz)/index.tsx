import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { questions } from "../../data/questions";

const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";

export default function HomeScreen() {
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
        <Text style={styles.title}>Quiz App</Text>
        <Text style={styles.subtitle}>
          Core Components + Flexbox + Expo Router Groups
        </Text>

        <View style={styles.row}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              Highest: {highest} / {questions.length}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              Last: {last} / {questions.length}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/(quiz)/quiz")}
        >
          <Text style={styles.primaryBtnText}>Start Quiz</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Use Previous / Next to move between questions.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  title: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 4,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  pillText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(124,92,255,0.85)",
    alignItems: "center",
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  hint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    lineHeight: 16,
  },
});

