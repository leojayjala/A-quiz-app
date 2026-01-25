import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0b1220" },
          headerTintColor: "rgba(255,255,255,0.92)",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#0b1220" },
        }}
      >
        <Stack.Screen name="(quiz)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

