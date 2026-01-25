import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Question, questions } from "../../data/questions";

const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";

type AnswerValue = string | string[];
type AnswersById = Record<number, AnswerValue | undefined>;

function toSortedArray(v: AnswerValue | undefined): string[] {
  if (!Array.isArray(v)) return [];
  return [...v].slice().sort();
}

function isCorrect(q: Question, user: AnswerValue | undefined): boolean {
  if (q.type === "checkbox") {
    const expected = toSortedArray(q.answer as string[]);
    const got = toSortedArray(user);
    if (expected.length !== got.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] !== got[i]) return false;
    }
    return true;
  }
  return typeof user === "string" && user === (q.answer as string);
}

export default function QuizScreen() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersById>({});

  const q = questions[index]!;

  const answeredCount = useMemo(
    () => Object.keys(answers).filter((k) => answers[Number(k)] != null).length,
    [answers]
  );

  const scoreSoFar = useMemo(() => {
    let score = 0;
    for (const qq of questions) {
      const a = answers[qq.id];
      if (a == null) continue;
      if (isCorrect(qq, a)) score += 1;
    }
    return score;
  }, [answers]);

  const isLast = index === questions.length - 1;

  async function finishQuiz() {
    const finalScore = scoreSoFar;
    await AsyncStorage.setItem(STORAGE_KEY_LAST, String(finalScore));

    const rawHighest = await AsyncStorage.getItem(STORAGE_KEY_HIGHEST);
    const currentHighest = rawHighest ? Number(rawHighest) : 0;
    if (!Number.isFinite(currentHighest) || finalScore > currentHighest) {
      await AsyncStorage.setItem(STORAGE_KEY_HIGHEST, String(finalScore));
    }

    router.replace("/(quiz)/results");
  }

  function toggleCheckboxChoice(qid: number, key: string) {
    setAnswers((prev) => {
      const current = prev[qid];
      const arr = Array.isArray(current) ? current : [];
      const exists = arr.includes(key);
      const nextArr = exists ? arr.filter((x) => x !== key) : [...arr, key];
      return { ...prev, [qid]: nextArr };
    });
  }

  function chooseRadioChoice(qid: number, key: string) {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  }

  const currentAnswer = answers[q.id];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Question {index + 1} / {questions.length}
        </Text>
        <View style={styles.headerRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              Answered: {answeredCount} / {questions.length}
            </Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              Score: {scoreSoFar} / {questions.length}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.card} showsVerticalScrollIndicator={false}>
        <Text style={styles.prompt}>{q.question}</Text>

        <TouchableOpacity
          style={styles.detailsBtn}
          activeOpacity={0.85}
          onPress={() => router.push(`/(quiz)/question/${q.id}`)}
        >
          <Text style={styles.detailsBtnText}>View details (dynamic route)</Text>
        </TouchableOpacity>

        <View style={styles.choices}>
          {Object.entries(q.choices).map(([key, label]) => {
            const selected =
              q.type === "checkbox"
                ? Array.isArray(currentAnswer) && currentAnswer.includes(key)
                : currentAnswer === key;

            return (
              <TouchableOpacity
                key={key}
                style={[styles.choice, selected ? styles.choiceSelected : null]}
                activeOpacity={0.85}
                onPress={() => {
                  if (q.type === "checkbox") toggleCheckboxChoice(q.id, key);
                  else chooseRadioChoice(q.id, key);
                }}
              >
                <View style={styles.choiceKey}>
                  <Text style={styles.choiceKeyText}>{key}</Text>
                </View>
                <Text style={styles.choiceText}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.hint}>
          {q.type === "checkbox" ? "Select all that apply." : "Select one answer."}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost, index === 0 ? styles.btnDisabled : null]}
            disabled={index === 0}
            activeOpacity={0.85}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <Text style={styles.btnText}>Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={() => {
              if (isLast) void finishQuiz();
              else setIndex((i) => Math.min(questions.length - 1, i + 1));
            }}
          >
            <Text style={styles.btnText}>{isLast ? "Finish" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  header: { gap: 10, paddingTop: 6 },
  headerTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    fontWeight: "800",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  pillText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  prompt: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  detailsBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  detailsBtnText: { color: "rgba(255,255,255,0.80)", fontSize: 12, fontWeight: "700" },
  choices: { gap: 10 },
  choice: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
  },
  choiceSelected: {
    borderColor: "rgba(124,92,255,0.55)",
    backgroundColor: "rgba(124,92,255,0.16)",
  },
  choiceKey: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceKeyText: { color: "rgba(255,255,255,0.88)", fontWeight: "800" },
  choiceText: { color: "rgba(255,255,255,0.88)", flex: 1, lineHeight: 20 },
  hint: { color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: "row", gap: 10, justifyContent: "space-between", marginTop: 2 },
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
  btnDisabled: { opacity: 0.45 },
  btnText: { color: "white", fontWeight: "800" },
});

