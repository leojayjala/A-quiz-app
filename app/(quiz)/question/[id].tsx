import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Question, questions as baseQuestions } from "../../../data/questions";
import { loadQuestions } from "../../../data/quizStore";

export default function QuestionDetails() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const n = id ? Number(id) : NaN;
  const [items, setItems] = useState<Question[]>(baseQuestions);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadQuestions();
      if (!cancelled) setItems(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const q = Number.isFinite(n) ? items.find((x) => x.id === n) : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Question Details</Text>
        <Text style={styles.meta}>id: {id ?? "(missing)"}</Text>

        {q ? (
          <>
            <Text style={styles.prompt}>{q.question}</Text>
            <Text style={styles.hint}>
              This screen demonstrates dynamic routing using{" "}
              <Text style={styles.code}>useLocalSearchParams</Text>.
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>
            Could not find a question for that id.
          </Text>
        )}

        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => router.back()}
        >
          <Text style={styles.btnText}>Back</Text>
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
  title: { color: "rgba(255,255,255,0.92)", fontSize: 22, fontWeight: "800" },
  meta: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  prompt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 4,
  },
  hint: { color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 18 },
  code: { color: "rgba(255,255,255,0.90)", fontWeight: "800" },
  btn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(124,92,255,0.85)",
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "800" },
});

