import { Stack } from "expo-router";

export default function QuizGroupLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0b1220" },
        headerTintColor: "rgba(255,255,255,0.92)",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#0b1220" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="quiz" options={{ title: "Quiz" }} />
      <Stack.Screen name="results" options={{ title: "Results" }} />
      <Stack.Screen name="question/[id]" options={{ title: "Details" }} />
    </Stack>
  );
}

