# Quiz App (Expo Router)

This is a simple **Quiz App** built with **React Native (Expo)** and **Expo Router**, demonstrating:

- Core components: `View`, `Text`, `TouchableOpacity`, `ScrollView`
- Flexbox layouts (`flex`, `flexDirection`, `justifyContent`, `alignItems`, `gap`)
- Expo Router **Groups**: routes live under `app/(quiz)/...` and have their own `_layout.tsx`
- Score tracking + persistent **highest score** using AsyncStorage
- `+not-found.tsx` for 404 routes (per the PDF)
- Dynamic routes using `useLocalSearchParams` (per the PDF)

## Run

1. Install dependencies:

```powershell
cd "c:\Users\Jala Fam\excercise 2"
npm install
```

2. Start the app:

```powershell
npm run start
```

## Routes (Expo Router)

- `app/(quiz)/index.tsx`: Home screen (Start Quiz)
- `app/(quiz)/quiz.tsx`: Quiz screen (Previous/Next, 1 question at a time)
- `app/(quiz)/results.tsx`: Results screen (highest score + current attempt)
- `app/(quiz)/question/[id].tsx`: Dynamic route example
- `app/+not-found.tsx`: Not-found route

## Data

Quiz content is in `data/questions.ts` (based on your `questions.js`).

