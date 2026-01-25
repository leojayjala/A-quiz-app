import { questions } from "./questions.js";

const root = document.getElementById("root");
const subtitleEl = document.getElementById("subtitle");

const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";

let state = {
  currentIndex: 0,
  answers: new Map(),
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function asSortedArray(value) {
  if (!Array.isArray(value)) return [];
  return [...value].slice().sort();
}

function isCorrect(q, userAnswer) {
  if (q.type === "checkbox") {
    const expected = asSortedArray(q.answer);
    const got = asSortedArray(userAnswer);
    if (expected.length !== got.length) return false;
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] !== got[i]) return false;
    }
    return true;
  }
  return typeof userAnswer === "string" && userAnswer === q.answer;
}

function computeScore(onlyAnswered = false) {
  let score = 0;
  for (const q of questions) {
    const has = state.answers.has(q.id);
    if (onlyAnswered && !has) continue;
    const user = state.answers.get(q.id);
    if (has && isCorrect(q, user)) score += 1;
  }
  return score;
}

function getHighestScore() {
  const raw = localStorage.getItem(STORAGE_KEY_HIGHEST);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function setHighestScore(n) {
  localStorage.setItem(STORAGE_KEY_HIGHEST, String(n));
}

function setLastScore(n) {
  localStorage.setItem(STORAGE_KEY_LAST, String(n));
}

function getLastScore() {
  const raw = localStorage.getItem(STORAGE_KEY_LAST);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

function navigate(hash) {
  if (location.hash === hash) {
    render();
    return;
  }
  location.hash = hash;
}

function resetAttempt() {
  state = {
    currentIndex: 0,
    answers: new Map(),
  };
}

function buildChoiceEl({ q, key, label }) {
  const wrapper = document.createElement("label");
  wrapper.className = "choice";

  const input = document.createElement("input");
  input.type = q.type === "checkbox" ? "checkbox" : "radio";
  input.name = `q_${q.id}`;
  input.value = key;

  const current = state.answers.get(q.id);
  if (q.type === "checkbox") {
    const arr = Array.isArray(current) ? current : [];
    input.checked = arr.includes(key);
  } else {
    input.checked = current === key;
  }

  input.addEventListener("change", () => {
    if (q.type === "checkbox") {
      const prev = state.answers.get(q.id);
      const arr = Array.isArray(prev) ? [...prev] : [];
      const has = arr.includes(key);
      const next = has ? arr.filter((x) => x !== key) : [...arr, key];
      state.answers.set(q.id, next);
    } else {
      state.answers.set(q.id, key);
    }
    render();
  });

  const keyEl = document.createElement("span");
  keyEl.className = "choice__key";
  keyEl.textContent = key;

  const textEl = document.createElement("span");
  textEl.className = "choice__text";
  textEl.textContent = label;

  wrapper.appendChild(input);
  wrapper.appendChild(keyEl);
  wrapper.appendChild(textEl);
  return wrapper;
}

function renderHome() {
  subtitleEl.textContent = "Answer the questions one by one and see your results at the end.";

  const highest = getHighestScore();
  const last = getLastScore();

  root.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.className = "row";

  const pill1 = document.createElement("div");
  pill1.className = "pill";
  pill1.textContent = `Highest score: ${highest} / ${questions.length}`;

  const pill2 = document.createElement("div");
  pill2.className = "pill";
  pill2.textContent = `Last attempt: ${last} / ${questions.length}`;

  topRow.appendChild(pill1);
  topRow.appendChild(pill2);

  const actions = document.createElement("div");
  actions.className = "actions";

  const startBtn = document.createElement("button");
  startBtn.className = "btn btn--primary";
  startBtn.type = "button";
  startBtn.textContent = "Start Quiz";
  startBtn.addEventListener("click", () => {
    resetAttempt();
    navigate("#quiz");
  });

  actions.appendChild(startBtn);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent =
    'Use "Previous" and "Next" to navigate. Your score updates as you answer.';

  root.appendChild(topRow);
  root.appendChild(hint);
  root.appendChild(actions);
}

function renderQuiz() {
  const q = questions[state.currentIndex];
  if (!q) {
    navigate("#home");
    return;
  }

  const answeredCount = state.answers.size;
  const currentScore = computeScore(true);

  subtitleEl.textContent = `Question ${state.currentIndex + 1} of ${
    questions.length
  }`;

  root.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.className = "row";

  const pillLeft = document.createElement("div");
  pillLeft.className = "pill";
  pillLeft.textContent = `Answered: ${answeredCount} / ${questions.length}`;

  const pillRight = document.createElement("div");
  pillRight.className = "pill";
  pillRight.textContent = `Score: ${currentScore} / ${questions.length}`;

  topRow.appendChild(pillLeft);
  topRow.appendChild(pillRight);

  const questionWrap = document.createElement("div");
  questionWrap.className = "question";

  const prompt = document.createElement("h2");
  prompt.className = "question__prompt";
  prompt.textContent = q.question;

  const choicesEl = document.createElement("div");
  choicesEl.className = "choices";

  for (const [key, label] of Object.entries(q.choices)) {
    choicesEl.appendChild(buildChoiceEl({ q, key, label }));
  }

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent =
    q.type === "checkbox"
      ? "Select all that apply."
      : "Select one answer.";

  questionWrap.appendChild(prompt);
  questionWrap.appendChild(choicesEl);
  questionWrap.appendChild(hint);

  const actions = document.createElement("div");
  actions.className = "actions";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn--ghost";
  prevBtn.type = "button";
  prevBtn.textContent = "Previous";
  prevBtn.disabled = state.currentIndex === 0;
  prevBtn.addEventListener("click", () => {
    state.currentIndex = clamp(state.currentIndex - 1, 0, questions.length - 1);
    render();
  });

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn--primary";
  nextBtn.type = "button";
  const isLast = state.currentIndex === questions.length - 1;
  nextBtn.textContent = isLast ? "Finish" : "Next";
  nextBtn.addEventListener("click", () => {
    if (isLast) {
      const finalScore = computeScore(false);
      setLastScore(finalScore);
      const highest = getHighestScore();
      if (finalScore > highest) setHighestScore(finalScore);
      navigate("#results");
      return;
    }

    state.currentIndex = clamp(state.currentIndex + 1, 0, questions.length - 1);
    render();
  });

  actions.appendChild(prevBtn);
  actions.appendChild(nextBtn);

  root.appendChild(topRow);
  root.appendChild(questionWrap);
  root.appendChild(actions);
}

function renderResults() {
  const current = getLastScore();
  const highest = getHighestScore();

  subtitleEl.textContent = "Results";
  root.innerHTML = "";

  const result = document.createElement("div");
  result.className = "result";

  const big = document.createElement("div");
  big.className = "result__big";
  big.textContent = `${current} / ${questions.length}`;

  const meta = document.createElement("div");
  meta.className = "result__meta";
  meta.textContent = `Highest score achieved: ${highest} / ${questions.length}`;

  result.appendChild(big);
  result.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "actions";

  const tryAgain = document.createElement("button");
  tryAgain.className = "btn btn--primary";
  tryAgain.type = "button";
  tryAgain.textContent = "Try Again";
  tryAgain.addEventListener("click", () => {
    resetAttempt();
    navigate("#quiz");
  });

  const home = document.createElement("button");
  home.className = "btn btn--ghost";
  home.type = "button";
  home.textContent = "Home";
  home.addEventListener("click", () => {
    navigate("#home");
  });

  actions.appendChild(home);
  actions.appendChild(tryAgain);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent =
    "Highest score is saved in your browser (localStorage) on this device.";

  root.appendChild(result);
  root.appendChild(actions);
  root.appendChild(hint);
}

function render() {
  const hash = location.hash || "#home";
  if (hash === "#quiz") return renderQuiz();
  if (hash === "#results") return renderResults();
  return renderHome();
}

window.addEventListener("hashchange", render);
render();

