import { questions as baseQuestions } from "./questions.js";

const root = document.getElementById("root");
const subtitleEl = document.getElementById("subtitle");

const STORAGE_KEY_HIGHEST = "quiz.highestScore.v1";
const STORAGE_KEY_LAST = "quiz.lastScore.v1";
const STORAGE_KEY_QUESTIONS = "quiz.items.v1";
const STORAGE_KEY_TIMER = "quiz.timerSeconds.v1";

let state = {
  currentIndex: 0,
  answers: new Map(),
  activeTab: "preview",
  questions: [],
  timerSeconds: 180,
  timerRemaining: null,
  timerId: null,
  showItemList: true,
  editingId: null,
  draft: null,
  settingsError: "",
};

function loadQuestions() {
  const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
  if (!raw) return baseQuestions.map((q) => ({ ...q }));
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return baseQuestions.map((q) => ({ ...q }));
    }
    return parsed
      .filter((q) => q && typeof q === "object")
      .map((q, idx) => {
        const safeId = Number.isFinite(Number(q.id)) ? Number(q.id) : idx + 1;
        const type = q.type === "checkbox" ? "checkbox" : q.type === "truefalse" ? "truefalse" : "multiple";
        const question = typeof q.question === "string" ? q.question : "Untitled question";
        const choices = q.choices && typeof q.choices === "object" ? { ...q.choices } : {};
        const answer = q.answer;
        return { id: safeId, type, question, choices, answer };
      });
  } catch {
    return baseQuestions.map((q) => ({ ...q }));
  }
}

function loadTimerSeconds() {
  const raw = localStorage.getItem(STORAGE_KEY_TIMER);
  const n = raw ? Number(raw) : 180;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 180;
}

state.questions = loadQuestions();
state.timerSeconds = loadTimerSeconds();

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
  for (const q of state.questions) {
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

function persistQuestions(nextQuestions) {
  state.questions = nextQuestions;
  localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(nextQuestions));
  setHighestScore(0);
  setLastScore(0);
}

function persistTimer(seconds) {
  state.timerSeconds = seconds;
  localStorage.setItem(STORAGE_KEY_TIMER, String(seconds));
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
    activeTab: state.activeTab,
    questions: state.questions,
    timerSeconds: state.timerSeconds,
    timerRemaining: null,
    timerId: state.timerId,
    showItemList: state.showItemList,
    editingId: state.editingId,
    draft: state.draft,
    settingsError: state.settingsError,
  };
  stopTimer();
}

function startTimer() {
  stopTimer();
  if (state.timerSeconds <= 0) return;
  state.timerRemaining = state.timerSeconds;
  state.timerId = window.setInterval(() => {
    state.timerRemaining -= 1;
    if (state.timerRemaining <= 0) {
      state.timerRemaining = 0;
      stopTimer();
      submitQuiz();
      return;
    }
    render();
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function submitQuiz() {
  const finalScore = computeScore(false);
  setLastScore(finalScore);
  const highest = getHighestScore();
  if (finalScore > highest) setHighestScore(finalScore);
  stopTimer();
  navigate("#results");
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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

function renderHome(container) {
  subtitleEl.textContent = "Answer the questions one by one and see your results at the end.";

  const highest = getHighestScore();
  const last = getLastScore();

  container.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.className = "row";

  const pill1 = document.createElement("div");
  pill1.className = "pill";
  pill1.textContent = `Highest score: ${highest} / ${state.questions.length}`;

  const pill2 = document.createElement("div");
  pill2.className = "pill";
  pill2.textContent = `Last attempt: ${last} / ${state.questions.length}`;

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
    startTimer();
    navigate("#quiz");
  });

  actions.appendChild(startBtn);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent =
    'Use "Previous" and "Next" to navigate. Your score updates as you answer.';

  container.appendChild(topRow);
  container.appendChild(hint);
  container.appendChild(actions);
}

function renderQuiz(container) {
  const q = state.questions[state.currentIndex];
  if (!q) {
    navigate("#home");
    return;
  }

  const answeredCount = state.answers.size;
  const currentScore = computeScore(true);

  subtitleEl.textContent = `Question ${state.currentIndex + 1} of ${
    state.questions.length
  }`;

  container.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.className = "row";

  const pillLeft = document.createElement("div");
  pillLeft.className = "pill";
  pillLeft.textContent = `Answered: ${answeredCount} / ${state.questions.length}`;

  const pillRight = document.createElement("div");
  pillRight.className = "pill";
  pillRight.textContent = `Score: ${currentScore} / ${state.questions.length}`;

  topRow.appendChild(pillLeft);
  topRow.appendChild(pillRight);

  if (state.timerSeconds > 0) {
    const timerPill = document.createElement("div");
    timerPill.className = "pill pill--timer";
    const remaining = state.timerRemaining ?? state.timerSeconds;
    timerPill.textContent = `Time left: ${formatTime(remaining)}`;
    topRow.appendChild(timerPill);
  }

  const questionWrap = document.createElement("div");
  questionWrap.className = "question";

  const prompt = document.createElement("h2");
  prompt.className = "question__prompt";
  prompt.textContent = q.question;

  const choicesEl = document.createElement("div");
  choicesEl.className = "choices";

  for (const [key, label] of Object.entries(q.choices)) {
    if (!label) continue;
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
    state.currentIndex = clamp(state.currentIndex - 1, 0, state.questions.length - 1);
    render();
  });

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn--primary";
  nextBtn.type = "button";
  const isLast = state.currentIndex === state.questions.length - 1;
  nextBtn.textContent = isLast ? "Finish" : "Next";
  nextBtn.addEventListener("click", () => {
    if (isLast) {
      submitQuiz();
      return;
    }

    state.currentIndex = clamp(state.currentIndex + 1, 0, state.questions.length - 1);
    render();
  });

  actions.appendChild(prevBtn);
  actions.appendChild(nextBtn);

  container.appendChild(topRow);
  container.appendChild(questionWrap);
  container.appendChild(actions);
}

function renderResults(container) {
  const current = getLastScore();
  const highest = getHighestScore();

  subtitleEl.textContent = "Results";
  container.innerHTML = "";

  const result = document.createElement("div");
  result.className = "result";

  const big = document.createElement("div");
  big.className = "result__big";
  big.textContent = `${current} / ${state.questions.length}`;

  const meta = document.createElement("div");
  meta.className = "result__meta";
  meta.textContent = `Highest score achieved: ${highest} / ${state.questions.length}`;

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
    startTimer();
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

  container.appendChild(result);
  container.appendChild(actions);
  container.appendChild(hint);
}

function render() {
  root.innerHTML = "";

  const tabs = document.createElement("div");
  tabs.className = "tabs";

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = `tab ${state.activeTab === "preview" ? "tab--active" : ""}`;
  previewBtn.textContent = "Preview Quiz";
  previewBtn.addEventListener("click", () => {
    state.activeTab = "preview";
    render();
  });

  const settingsBtn = document.createElement("button");
  settingsBtn.type = "button";
  settingsBtn.className = `tab ${state.activeTab === "settings" ? "tab--active" : ""}`;
  settingsBtn.textContent = "Quiz Settings";
  settingsBtn.addEventListener("click", () => {
    state.activeTab = "settings";
    stopTimer();
    render();
  });

  tabs.appendChild(previewBtn);
  tabs.appendChild(settingsBtn);

  const content = document.createElement("div");
  content.className = "tab__panel";

  root.appendChild(tabs);
  root.appendChild(content);

  if (state.activeTab === "settings") {
    renderSettings(content);
    return;
  }

  const hash = location.hash || "#home";
  if (hash === "#quiz") return renderQuiz(content);
  if (hash === "#results") return renderResults(content);
  return renderHome(content);
}

window.addEventListener("hashchange", render);
render();

function makeEmptyDraft() {
  return {
    id: null,
    type: "multiple",
    question: "",
    choices: {
      A: "",
      B: "",
      C: "",
      D: "",
    },
    answer: "A",
  };
}

function cloneQuestion(q) {
  return {
    id: q.id,
    type: q.type,
    question: q.question,
    choices: { ...q.choices },
    answer: Array.isArray(q.answer) ? [...q.answer] : q.answer,
  };
}

function getNextId() {
  const ids = state.questions.map((q) => q.id);
  const max = ids.length ? Math.max(...ids) : 0;
  return max + 1;
}

function sanitizeChoices(choices) {
  const cleaned = {};
  for (const [key, value] of Object.entries(choices)) {
    const label = typeof value === "string" ? value.trim() : "";
    if (label) cleaned[key] = label;
  }
  return cleaned;
}

function normalizeDraft(draft) {
  const trimmedQuestion = draft.question.trim();
  const cleanedChoices = sanitizeChoices(draft.choices);
  const keys = Object.keys(cleanedChoices);
  if (!trimmedQuestion) {
    state.settingsError = "Question text is required.";
    return null;
  }
  if (keys.length < 2) {
    state.settingsError = "Provide at least two choices.";
    return null;
  }
  let answer = draft.answer;
  if (draft.type === "checkbox") {
    const arr = Array.isArray(answer) ? answer.filter((k) => keys.includes(k)) : [];
    if (arr.length === 0) {
      state.settingsError = "Select at least one correct answer.";
      return null;
    }
    answer = arr;
  } else {
    if (!keys.includes(answer)) {
      answer = keys[0];
    }
  }

  state.settingsError = "";
  return {
    id: draft.id ?? getNextId(),
    type: draft.type,
    question: trimmedQuestion,
    choices: cleanedChoices,
    answer,
  };
}

function renderSettings(container) {
  subtitleEl.textContent = "Manage quiz items and timer settings.";
  container.innerHTML = "";

  const settingsWrap = document.createElement("div");
  settingsWrap.className = "settings";

  const timerCard = document.createElement("div");
  timerCard.className = "panel";

  const timerTitle = document.createElement("h3");
  timerTitle.className = "panel__title";
  timerTitle.textContent = "Quiz Timer";

  const timerDesc = document.createElement("p");
  timerDesc.className = "panel__desc";
  timerDesc.textContent = "Set the total time for the quiz. Set to 0 to disable the timer.";

  const timerForm = document.createElement("div");
  timerForm.className = "form-row";

  const minutesInput = document.createElement("input");
  minutesInput.type = "number";
  minutesInput.min = "0";
  minutesInput.value = String(Math.floor(state.timerSeconds / 60));
  minutesInput.className = "input";

  const minutesLabel = document.createElement("label");
  minutesLabel.className = "label";
  minutesLabel.textContent = "Minutes";
  minutesLabel.appendChild(minutesInput);

  const secondsInput = document.createElement("input");
  secondsInput.type = "number";
  secondsInput.min = "0";
  secondsInput.max = "59";
  secondsInput.value = String(state.timerSeconds % 60);
  secondsInput.className = "input";

  const secondsLabel = document.createElement("label");
  secondsLabel.className = "label";
  secondsLabel.textContent = "Seconds";
  secondsLabel.appendChild(secondsInput);

  const saveTimer = document.createElement("button");
  saveTimer.type = "button";
  saveTimer.className = "btn btn--primary";
  saveTimer.textContent = "Save Timer";
  saveTimer.addEventListener("click", () => {
    const mins = Math.max(0, Number(minutesInput.value || 0));
    const secs = Math.max(0, Math.min(59, Number(secondsInput.value || 0)));
    const total = Math.floor(mins * 60 + secs);
    persistTimer(total);
    render();
  });

  timerForm.appendChild(minutesLabel);
  timerForm.appendChild(secondsLabel);
  timerForm.appendChild(saveTimer);

  timerCard.appendChild(timerTitle);
  timerCard.appendChild(timerDesc);
  timerCard.appendChild(timerForm);

  const listCard = document.createElement("div");
  listCard.className = "panel";

  const listTitleRow = document.createElement("div");
  listTitleRow.className = "panel__header";

  const listTitle = document.createElement("h3");
  listTitle.className = "panel__title";
  listTitle.textContent = "Quiz Item List";

  const listToggle = document.createElement("button");
  listToggle.type = "button";
  listToggle.className = "btn btn--ghost";
  listToggle.textContent = state.showItemList ? "Hide List" : "Show List";
  listToggle.addEventListener("click", () => {
    state.showItemList = !state.showItemList;
    render();
  });

  listTitleRow.appendChild(listTitle);
  listTitleRow.appendChild(listToggle);

  listCard.appendChild(listTitleRow);

  if (state.showItemList) {
    const listActions = document.createElement("div");
    listActions.className = "actions actions--left";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn--primary";
    addBtn.textContent = "Add Question";
    addBtn.addEventListener("click", () => {
      state.editingId = null;
      state.draft = makeEmptyDraft();
      render();
    });

    listActions.appendChild(addBtn);
    listCard.appendChild(listActions);

    const list = document.createElement("div");
    list.className = "item-list";

    for (const q of state.questions) {
      const row = document.createElement("div");
      row.className = "item-row";

      const meta = document.createElement("div");
      meta.className = "item-meta";

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = q.question;

      const sub = document.createElement("div");
      sub.className = "item-sub";
      sub.textContent = `${q.type.toUpperCase()} • ${Object.keys(q.choices).length} choices`;

      meta.appendChild(title);
      meta.appendChild(sub);

      const rowActions = document.createElement("div");
      rowActions.className = "item-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn--ghost";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        state.editingId = q.id;
        state.draft = cloneQuestion(q);
        render();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn--danger";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        const next = state.questions.filter((item) => item.id !== q.id);
        if (next.length === 0) {
          state.settingsError = "Quiz needs at least one question.";
          render();
          return;
        }
        persistQuestions(next);
        resetAttempt();
        render();
      });

      rowActions.appendChild(editBtn);
      rowActions.appendChild(deleteBtn);

      row.appendChild(meta);
      row.appendChild(rowActions);
      list.appendChild(row);
    }

    listCard.appendChild(list);

    const editor = document.createElement("div");
    editor.className = "editor";

    if (state.draft) {
      const draft = state.draft;

      const editorTitle = document.createElement("h4");
      editorTitle.className = "panel__title";
      editorTitle.textContent = draft.id ? "Edit Question" : "New Question";

      const fieldQuestion = document.createElement("label");
      fieldQuestion.className = "label";
      fieldQuestion.textContent = "Question Text";

      const questionInput = document.createElement("input");
      questionInput.type = "text";
      questionInput.className = "input";
      questionInput.value = draft.question;
      questionInput.addEventListener("input", (e) => {
        draft.question = e.target.value;
      });
      fieldQuestion.appendChild(questionInput);

      const fieldType = document.createElement("label");
      fieldType.className = "label";
      fieldType.textContent = "Question Type";

      const typeSelect = document.createElement("select");
      typeSelect.className = "input";
      for (const option of ["multiple", "truefalse", "checkbox"]) {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option === "truefalse" ? "true/false" : option;
        if (draft.type === option) opt.selected = true;
        typeSelect.appendChild(opt);
      }
      typeSelect.addEventListener("change", (e) => {
        draft.type = e.target.value;
        if (draft.type === "truefalse") {
          draft.choices = { A: "True", B: "False", C: "", D: "" };
          draft.answer = "A";
        } else if (draft.type === "checkbox") {
          draft.answer = Array.isArray(draft.answer) ? draft.answer : ["A"];
        } else {
          draft.answer = typeof draft.answer === "string" ? draft.answer : "A";
        }
        render();
      });
      fieldType.appendChild(typeSelect);

      const choicesWrap = document.createElement("div");
      choicesWrap.className = "choices-editor";

      const choiceKeys = ["A", "B", "C", "D"];
      for (const key of choiceKeys) {
        const choiceLabel = document.createElement("label");
        choiceLabel.className = "label";
        choiceLabel.textContent = `Choice ${key}`;

        const choiceInput = document.createElement("input");
        choiceInput.type = "text";
        choiceInput.className = "input";
        choiceInput.value = draft.choices[key] || "";
        if (draft.type === "truefalse" && (key === "C" || key === "D")) {
          choiceInput.disabled = true;
        }
        choiceInput.addEventListener("input", (e) => {
          draft.choices[key] = e.target.value;
        });

        choiceLabel.appendChild(choiceInput);
        choicesWrap.appendChild(choiceLabel);
      }

      const answerWrap = document.createElement("div");
      answerWrap.className = "answer-wrap";

      const answerLabel = document.createElement("div");
      answerLabel.className = "label";
      answerLabel.textContent = "Correct Answer";
      answerWrap.appendChild(answerLabel);

      if (draft.type === "checkbox") {
        const checkRow = document.createElement("div");
        checkRow.className = "check-row";
        for (const key of choiceKeys) {
          if (draft.type === "truefalse" && (key === "C" || key === "D")) continue;
          const checkLabel = document.createElement("label");
          checkLabel.className = "check";

          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = Array.isArray(draft.answer) && draft.answer.includes(key);
          input.addEventListener("change", () => {
            const arr = Array.isArray(draft.answer) ? [...draft.answer] : [];
            if (input.checked) {
              if (!arr.includes(key)) arr.push(key);
            } else {
              const idx = arr.indexOf(key);
              if (idx >= 0) arr.splice(idx, 1);
            }
            draft.answer = arr;
          });

          const span = document.createElement("span");
          span.textContent = key;

          checkLabel.appendChild(input);
          checkLabel.appendChild(span);
          checkRow.appendChild(checkLabel);
        }
        answerWrap.appendChild(checkRow);
      } else {
        const answerSelect = document.createElement("select");
        answerSelect.className = "input";
        for (const key of choiceKeys) {
          if (draft.type === "truefalse" && (key === "C" || key === "D")) continue;
          const opt = document.createElement("option");
          opt.value = key;
          opt.textContent = key;
          if (draft.answer === key) opt.selected = true;
          answerSelect.appendChild(opt);
        }
        answerSelect.addEventListener("change", (e) => {
          draft.answer = e.target.value;
        });
        answerWrap.appendChild(answerSelect);
      }

      const error = document.createElement("div");
      error.className = "error";
      error.textContent = state.settingsError || "";

      const editorActions = document.createElement("div");
      editorActions.className = "actions actions--left";

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn btn--primary";
      saveBtn.textContent = "Save Question";
      saveBtn.addEventListener("click", () => {
        const normalized = normalizeDraft(draft);
        if (!normalized) {
          render();
          return;
        }
        const next = draft.id
          ? state.questions.map((q) => (q.id === draft.id ? normalized : q))
          : [...state.questions, normalized];
        persistQuestions(next);
        resetAttempt();
        state.draft = null;
        state.editingId = null;
        render();
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn--ghost";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        state.draft = null;
        state.editingId = null;
        state.settingsError = "";
        render();
      });

      editorActions.appendChild(cancelBtn);
      editorActions.appendChild(saveBtn);

      editor.appendChild(editorTitle);
      editor.appendChild(fieldQuestion);
      editor.appendChild(fieldType);
      editor.appendChild(choicesWrap);
      editor.appendChild(answerWrap);
      if (state.settingsError) editor.appendChild(error);
      editor.appendChild(editorActions);
    } else {
      const placeholder = document.createElement("p");
      placeholder.className = "hint";
      placeholder.textContent = "Select a question to edit or add a new one.";
      editor.appendChild(placeholder);
    }

    listCard.appendChild(editor);
  }

  if (state.settingsError && !state.draft) {
    const error = document.createElement("div");
    error.className = "error";
    error.textContent = state.settingsError;
    listCard.appendChild(error);
  }

  settingsWrap.appendChild(timerCard);
  settingsWrap.appendChild(listCard);
  container.appendChild(settingsWrap);
}

