import AsyncStorage from "@react-native-async-storage/async-storage";

import { Question, questions as baseQuestions } from "./questions";

const STORAGE_KEY_QUESTIONS = "quiz.items.v1";
const STORAGE_KEY_TIMER = "quiz.timerSeconds.v1";
const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";

function normalizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0) return baseQuestions;
  return value
    .filter((q) => q && typeof q === "object")
    .map((q, idx) => {
      const data = q as Partial<Question>;
      const id = Number.isFinite(Number(data.id)) ? Number(data.id) : idx + 1;
      const type =
        data.type === "checkbox"
          ? "checkbox"
          : data.type === "truefalse"
            ? "truefalse"
            : "multiple";
      const question = typeof data.question === "string" ? data.question : "Untitled question";
      const choices =
        data.choices && typeof data.choices === "object" ? { ...data.choices } : {};
      const answer = data.answer ?? "A";
      return { id, type, question, choices, answer };
    });
}

export async function loadQuestions(): Promise<Question[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_QUESTIONS);
  if (!raw) return baseQuestions;
  try {
    return normalizeQuestions(JSON.parse(raw));
  } catch {
    return baseQuestions;
  }
}

export async function saveQuestions(next: Question[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(next));
}

export async function loadTimerSeconds(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_TIMER);
  const n = raw ? Number(raw) : 180;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 180;
}

export async function saveTimerSeconds(seconds: number): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_TIMER, String(seconds));
}

export async function resetScores(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_HIGHEST, "0");
  await AsyncStorage.setItem(STORAGE_KEY_LAST, "0");
}
