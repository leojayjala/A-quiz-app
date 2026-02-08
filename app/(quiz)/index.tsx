import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Question, QuestionType, questions as baseQuestions } from "../../data/questions";
import {
  loadQuestions,
  loadTimerSeconds,
  resetScores,
  saveQuestions,
  saveTimerSeconds,
} from "../../data/quizStore";

const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";

type DraftQuestion = {
  id: number | null;
  type: QuestionType;
  question: string;
  choices: Record<string, string>;
  answer: string | string[];
};

function makeEmptyDraft(): DraftQuestion {
  return {
    id: null,
    type: "multiple",
    question: "",
    choices: { A: "", B: "", C: "", D: "" },
    answer: "A",
  };
}

function cloneQuestion(q: Question): DraftQuestion {
  return {
    id: q.id,
    type: q.type,
    question: q.question,
    choices: { ...q.choices },
    answer: Array.isArray(q.answer) ? [...q.answer] : q.answer,
  };
}

function getNextId(items: Question[]): number {
  const max = items.length ? Math.max(...items.map((q) => q.id)) : 0;
  return max + 1;
}

function sanitizeChoices(choices: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(choices)) {
    const label = value.trim();
    if (label) cleaned[key] = label;
  }
  return cleaned;
}

function normalizeDraft(draft: DraftQuestion, items: Question[]): Question | null {
  const trimmedQuestion = draft.question.trim();
  if (!trimmedQuestion) return null;

  const cleanedChoices = sanitizeChoices(draft.choices);
  const keys = Object.keys(cleanedChoices);
  if (keys.length < 2) return null;

  let answer = draft.answer;
  if (draft.type === "checkbox") {
    const arr = Array.isArray(answer) ? answer.filter((k) => keys.includes(k)) : [];
    if (arr.length === 0) return null;
    answer = arr;
  } else if (!keys.includes(answer as string)) {
    answer = keys[0];
  }

  return {
    id: draft.id ?? getNextId(items),
    type: draft.type,
    question: trimmedQuestion,
    choices: cleanedChoices,
    answer,
  };
}

export default function HomeScreen() {
  const [highest, setHighest] = useState(0);
  const [last, setLast] = useState(0);
  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");
  const [items, setItems] = useState<Question[]>(baseQuestions);
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [timerDraftMinutes, setTimerDraftMinutes] = useState("3");
  const [timerDraftSeconds, setTimerDraftSeconds] = useState("0");
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const rawHighest = await AsyncStorage.getItem(STORAGE_KEY_HIGHEST);
        const rawLast = await AsyncStorage.getItem(STORAGE_KEY_LAST);
        const h = rawHighest ? Number(rawHighest) : 0;
        const l = rawLast ? Number(rawLast) : 0;
        const q = await loadQuestions();
        const timer = await loadTimerSeconds();
        if (cancelled) return;
        setHighest(Number.isFinite(h) ? h : 0);
        setLast(Number.isFinite(l) ? l : 0);
        setItems(q);
        setTimerSeconds(timer);
        setTimerDraftMinutes(String(Math.floor(timer / 60)));
        setTimerDraftSeconds(String(timer % 60));
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const previewCount = items.length;

  async function handleSaveTimer(nextMinutes: string, nextSeconds: string) {
    const mins = Math.max(0, Number(nextMinutes || 0));
    const secs = Math.max(0, Math.min(59, Number(nextSeconds || 0)));
    const total = Math.floor(mins * 60 + secs);
    await saveTimerSeconds(total);
    setTimerSeconds(total);
    setTimerDraftMinutes(String(Math.floor(total / 60)));
    setTimerDraftSeconds(String(total % 60));
  }

  async function persistItems(next: Question[]) {
    await saveQuestions(next);
    await resetScores();
    setItems(next);
    setHighest(0);
    setLast(0);
  }

  const questionRows = items.map((q) => (
    <View key={q.id} style={styles.itemRow}>
      <View style={styles.itemMeta}>
        <Text style={styles.itemTitle}>{q.question}</Text>
        <Text style={styles.itemSub}>
          {q.type.toUpperCase()} • {Object.keys(q.choices).length} choices
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnGhostSmall]}
          onPress={() => {
            setDraft(cloneQuestion(q));
            setError("");
          }}
        >
          <Text style={styles.btnTextSmall}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnDangerSmall]}
          onPress={async () => {
            const next = items.filter((item) => item.id !== q.id);
            if (next.length === 0) {
              setError("Quiz needs at least one question.");
              return;
            }
            setError("");
            await persistItems(next);
          }}
        >
          <Text style={styles.btnTextSmall}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  ));

  return (
    <View style={styles.screen}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "preview" ? styles.tabActive : null]}
          onPress={() => setActiveTab("preview")}
        >
          <Text style={styles.tabText}>Preview Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "settings" ? styles.tabActive : null]}
          onPress={() => setActiveTab("settings")}
        >
          <Text style={styles.tabText}>Quiz Settings</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "preview" ? (
        <View style={styles.card}>
          <Text style={styles.title}>Quiz App</Text>
          <Text style={styles.subtitle}>
            Core Components + Flexbox + Expo Router Groups
          </Text>

          <View style={styles.row}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                Highest: {highest} / {previewCount}
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                Last: {last} / {previewCount}
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
      ) : (
        <ScrollView contentContainerStyle={styles.settings} showsVerticalScrollIndicator={false}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Quiz Timer</Text>
            <Text style={styles.panelDesc}>
              Set the total time for the quiz. Use 0 to disable the timer.
            </Text>
            <View style={styles.timerRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Minutes</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={timerDraftMinutes}
                  onChangeText={setTimerDraftMinutes}
                  placeholder="0"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Seconds</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={timerDraftSeconds}
                  onChangeText={setTimerDraftSeconds}
                  placeholder="0"
                />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={async () => {
                await handleSaveTimer(timerDraftMinutes, timerDraftSeconds);
              }}
            >
              <Text style={styles.btnText}>Save Timer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Quiz Item List</Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimarySmall]}
                onPress={() => {
                  setDraft(makeEmptyDraft());
                  setError("");
                }}
              >
                <Text style={styles.btnTextSmall}>Add Question</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.list}>{questionRows}</View>

            {draft ? (
              <View style={styles.editor}>
                <Text style={styles.panelTitle}>
                  {draft.id ? "Edit Question" : "New Question"}
                </Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Question Text</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.question}
                    onChangeText={(value) => setDraft({ ...draft, question: value })}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Question Type</Text>
                  <View style={styles.typeRow}>
                    {(["multiple", "truefalse", "checkbox"] as QuestionType[]).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeBtn,
                          draft.type === type ? styles.typeBtnActive : null,
                        ]}
                        onPress={() => {
                          if (type === "truefalse") {
                            setDraft({
                              ...draft,
                              type,
                              choices: { A: "True", B: "False", C: "", D: "" },
                              answer: "A",
                            });
                          } else if (type === "checkbox") {
                            setDraft({
                              ...draft,
                              type,
                              answer: Array.isArray(draft.answer)
                                ? draft.answer
                                : ["A"],
                            });
                          } else {
                            setDraft({
                              ...draft,
                              type,
                              answer: typeof draft.answer === "string" ? draft.answer : "A",
                            });
                          }
                        }}
                      >
                        <Text style={styles.typeBtnText}>
                          {type === "truefalse" ? "true/false" : type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.choiceGrid}>
                  {(["A", "B", "C", "D"] as const).map((key) => (
                    <View key={key} style={styles.field}>
                      <Text style={styles.fieldLabel}>Choice {key}</Text>
                      <TextInput
                        style={styles.input}
                        value={draft.choices[key] ?? ""}
                        editable={!(draft.type === "truefalse" && (key === "C" || key === "D"))}
                        onChangeText={(value) =>
                          setDraft({ ...draft, choices: { ...draft.choices, [key]: value } })
                        }
                      />
                    </View>
                  ))}
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Correct Answer</Text>
                  {draft.type === "checkbox" ? (
                    <View style={styles.answerRow}>
                      {(draft.type === "truefalse"
                        ? (["A", "B"] as const)
                        : (["A", "B", "C", "D"] as const)
                      ).map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.answerBtn,
                            Array.isArray(draft.answer) && draft.answer.includes(key)
                              ? styles.answerBtnActive
                              : null,
                          ]}
                          onPress={() => {
                            const arr = Array.isArray(draft.answer) ? [...draft.answer] : [];
                            const next = arr.includes(key)
                              ? arr.filter((x) => x !== key)
                              : [...arr, key];
                            setDraft({ ...draft, answer: next });
                          }}
                        >
                          <Text style={styles.answerBtnText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.answerRow}>
                      {(draft.type === "truefalse"
                        ? (["A", "B"] as const)
                        : (["A", "B", "C", "D"] as const)
                      ).map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.answerBtn,
                            draft.answer === key ? styles.answerBtnActive : null,
                          ]}
                          onPress={() => setDraft({ ...draft, answer: key })}
                        >
                          <Text style={styles.answerBtnText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.editorActions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnGhost]}
                    onPress={() => {
                      setDraft(null);
                      setError("");
                    }}
                  >
                    <Text style={styles.btnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={async () => {
                      const normalized = normalizeDraft(draft, items);
                      if (!normalized) {
                        setError("Please provide a question, 2+ choices, and a correct answer.");
                        return;
                      }
                      const next = draft.id
                        ? items.map((q) => (q.id === draft.id ? normalized : q))
                        : [...items, normalized];
                      setError("");
                      await persistItems(next);
                      setDraft(null);
                    }}
                  >
                    <Text style={styles.btnText}>Save Question</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {!draft && error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  tabs: {
    flexDirection: "row",
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  tabActive: {
    backgroundColor: "rgba(124,92,255,0.85)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  tabText: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 12 },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  title: { color: "rgba(255,255,255,0.92)", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 18 },
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
  pillText: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(124,92,255,0.85)",
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "800", letterSpacing: 0.2 },
  hint: { color: "rgba(255,255,255,0.55)", fontSize: 12, lineHeight: 16 },
  settings: { gap: 16, paddingBottom: 20 },
  panel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  panelTitle: { color: "rgba(255,255,255,0.92)", fontSize: 16, fontWeight: "700" },
  panelDesc: { color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 16 },
  timerRow: { flexDirection: "row", gap: 12 },
  field: { gap: 6, flex: 1 },
  fieldLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  input: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "rgba(255,255,255,0.9)",
  },
  list: { gap: 10 },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  itemMeta: { flex: 1, gap: 4 },
  itemTitle: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "700" },
  itemSub: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  itemActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  editor: { gap: 12, paddingTop: 8 },
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  typeBtnActive: { backgroundColor: "rgba(124,92,255,0.85)" },
  typeBtnText: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  answerRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  answerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  answerBtnActive: { backgroundColor: "rgba(45,212,191,0.4)" },
  answerBtnText: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  editorActions: { flexDirection: "row", gap: 10 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  btnPrimary: {
    backgroundColor: "rgba(124,92,255,0.85)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  btnGhost: { backgroundColor: "transparent" },
  btnPrimarySmall: {
    backgroundColor: "rgba(124,92,255,0.85)",
    borderColor: "rgba(255,255,255,0.24)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnGhostSmall: {
    backgroundColor: "transparent",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnDangerSmall: {
    backgroundColor: "rgba(251,113,133,0.2)",
    borderColor: "rgba(251,113,133,0.4)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnText: { color: "white", fontWeight: "800" },
  btnTextSmall: { color: "white", fontWeight: "700", fontSize: 12 },
  error: { color: "rgba(251,113,133,0.95)", fontSize: 12 },
});
