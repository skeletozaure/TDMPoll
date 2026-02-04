// === Firebase Configuration ===
const firebaseConfig = {
  apiKey: "AIzaSyBPpm_2KsIQLOG1fQ_qoXOmKOwhIdhApFY",
  authDomain: "tdmpoll.firebaseapp.com",
  projectId: "tdmpoll",
  storageBucket: "tdmpoll.firebasestorage.app",
  messagingSenderId: "956195330838",
  appId: "1:956195330838:web:0d581bb3f12c2ee667ce37"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// === Constants ===
const DEFAULT_OPTIONS = ["MARS", "VENUS"];
const DEV_NAME_LENGTH = 4;
const PROD_NAME_LENGTH = 5;
const VOTES_DOC = "votes";
const VOTES_COLLECTION = "poll";
const BROWSER_ID_KEY = "browser_fingerprint_v1";

// === Browser Fingerprint ===
const getBrowserFingerprint = async () => {
  const stored = localStorage.getItem(BROWSER_ID_KEY);
  if (stored) return stored;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("browser_fingerprint", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("browser_fingerprint", 4, 17);
  const canvasData = canvas.toDataURL();

  const fingerprint = await sha256(
    `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${canvasData}`
  );

  localStorage.setItem(BROWSER_ID_KEY, fingerprint);
  return fingerprint;
};

const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// === DOM Elements ===
const elements = {
  devOptions: document.getElementById("dev-options"),
  prodOptions: document.getElementById("prod-options"),
  devAdd: document.getElementById("dev-add"),
  prodAdd: document.getElementById("prod-add"),
  devError: document.getElementById("dev-error"),
  prodError: document.getElementById("prod-error"),
  formError: document.getElementById("form-error"),
  voteForm: document.getElementById("vote-form"),
  results: document.getElementById("results"),
  devResults: document.getElementById("dev-results"),
  prodResults: document.getElementById("prod-results"),
  ballotSummary: document.getElementById("ballot-summary"),
  alreadyVoted: document.getElementById("already-voted"),
};

// === Utilities ===
const normalizeName = (value) => value.trim().toUpperCase();

const validateName = (value, length) => {
  const normalized = normalizeName(value);
  if (normalized.length !== length) {
    return { ok: false, value: normalized };
  }
  return { ok: true, value: normalized };
};

const filterOptionsByLength = (options, length) =>
  options.filter((name) => name.length === length);

const clearErrors = () => {
  elements.devError.textContent = "";
  elements.prodError.textContent = "";
  elements.formError.textContent = "";
};

// === Firestore Operations ===
const getVotesState = async () => {
  try {
    const doc = await db.collection(VOTES_COLLECTION).doc(VOTES_DOC).get();
    if (doc.exists) {
      return doc.data();
    }
    return getInitialState();
  } catch (error) {
    console.error("Erreur lors de la lecture des votes:", error);
    return getInitialState();
  }
};

const getInitialState = () => {
  const initial = {
    options: [...DEFAULT_OPTIONS],
    votes: {
      DEV: {},
      PROD: {},
    },
    voters: {},
    meta: {
      createdAt: new Date().toISOString(),
      version: 2,
    },
  };

  DEFAULT_OPTIONS.forEach((name) => {
    initial.votes.DEV[name] = 0;
    initial.votes.PROD[name] = 0;
  });

  return initial;
};

const saveVotesState = async (state) => {
  try {
    await db.collection(VOTES_COLLECTION).doc(VOTES_DOC).set(state);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des votes:", error);
    throw error;
  }
};

const hasVotedByCursorId = async (browserId) => {
  try {
    const state = await getVotesState();
    return state.voters[browserId] || null;
  } catch (error) {
    console.error("Erreur lors de la vérification du vote:", error);
    return null;
  }
};

const ensureOption = (state, value) => {
  if (!state.options.includes(value)) {
    state.options.push(value);
  }
  state.votes.DEV[value] = state.votes.DEV[value] || 0;
  state.votes.PROD[value] = state.votes.PROD[value] || 0;
};

// === Rendering ===
const renderOptions = (state) => {
  elements.devOptions.innerHTML = "";
  elements.prodOptions.innerHTML = "";

  filterOptionsByLength(state.options, DEV_NAME_LENGTH).forEach((name) => {
    const devOption = document.createElement("label");
    devOption.className = "option";
    devOption.innerHTML = `
      <input type="radio" name="dev" value="${name}" />
      <span>${name}</span>
    `;
    elements.devOptions.appendChild(devOption);
  });

  filterOptionsByLength(state.options, PROD_NAME_LENGTH).forEach((name) => {
    const prodOption = document.createElement("label");
    prodOption.className = "option";
    prodOption.innerHTML = `
      <input type="radio" name="prod" value="${name}" />
      <span>${name}</span>
    `;
    elements.prodOptions.appendChild(prodOption);
  });
};

const renderResults = (state, ballot, hasVoted) => {
  elements.results.classList.remove("hidden");
  elements.ballotSummary.textContent = `Votre vote : DEV = ${ballot.DEV}, PROD = ${ballot.PROD}.`;
  elements.alreadyVoted.classList.toggle("hidden", !hasVoted);

  const renderList = (target, votes, length) => {
    target.innerHTML = "";
    const total = Object.values(votes).reduce((sum, count) => sum + count, 0);
    filterOptionsByLength(state.options, length).forEach((name) => {
      const count = votes[name] || 0;
      const percent = total === 0 ? 0 : Math.round((count / total) * 100);
      const item = document.createElement("div");
      item.className = "result-item";
      item.innerHTML = `
        <div class="result-header">
          <span>${name}</span>
          <span>${percent}% • ${count} vote${count > 1 ? "s" : ""}</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${percent}%;"></div></div>
      `;
      target.appendChild(item);
    });
  };

  renderList(elements.devResults, state.votes.DEV, DEV_NAME_LENGTH);
  renderList(elements.prodResults, state.votes.PROD, PROD_NAME_LENGTH);
};

// === Vote Submission ===
const submitVote = async (event) => {
  event.preventDefault();
  clearErrors();

  try {
    const browserId = await getBrowserFingerprint();
    const state = await getVotesState();

    const existingVote = await hasVotedByCursorId(browserId);
    if (existingVote) {
      elements.formError.textContent = "Vous avez déjà voté sur ce navigateur.";
      renderOptions(state);
      renderResults(state, existingVote, true);
      return;
    }

    const devRadio = document.querySelector("input[name='dev']:checked");
    const prodRadio = document.querySelector("input[name='prod']:checked");

    const devInput = elements.devAdd.value;
    const prodInput = elements.prodAdd.value;

    let devChoice = devRadio ? devRadio.value : "";
    let prodChoice = prodRadio ? prodRadio.value : "";

    if (devInput.trim().length > 0) {
      const validation = validateName(devInput, DEV_NAME_LENGTH);
      if (!validation.ok) {
        elements.devError.textContent = "Nom DEV invalide (4 caractères requis).";
        return;
      }
      devChoice = validation.value;
      ensureOption(state, devChoice);
    }

    if (prodInput.trim().length > 0) {
      const validation = validateName(prodInput, PROD_NAME_LENGTH);
      if (!validation.ok) {
        elements.prodError.textContent = "Nom PROD invalide (5 caractères requis).";
        return;
      }
      prodChoice = validation.value;
      ensureOption(state, prodChoice);
    }

    if (!devChoice || !prodChoice) {
      elements.formError.textContent = "Vous devez voter pour DEV et PROD.";
      return;
    }

    if (devChoice === prodChoice) {
      elements.formError.textContent = "DEV et PROD doivent être différents.";
      return;
    }

    state.votes.DEV[devChoice] = (state.votes.DEV[devChoice] || 0) + 1;
    state.votes.PROD[prodChoice] = (state.votes.PROD[prodChoice] || 0) + 1;

    state.voters[browserId] = {
      DEV: devChoice,
      PROD: prodChoice,
      at: new Date().toISOString(),
    };

    await saveVotesState(state);

    const ballot = { DEV: devChoice, PROD: prodChoice };
    renderOptions(state);
    renderResults(state, ballot, true);
    elements.voteForm.reset();
  } catch (error) {
    console.error("Erreur lors du vote:", error);
    elements.formError.textContent = "Erreur lors de l'enregistrement du vote. Réessayez.";
  }
};

// === Reset for Testing ===
const resetIfRequested = async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "1") {
    try {
      const initial = getInitialState();
      await saveVotesState(initial);
      localStorage.removeItem(BROWSER_ID_KEY);
      location.replace(location.pathname);
    } catch (error) {
      console.error("Erreur lors du reset:", error);
    }
  }
};

// === Initialization ===
const init = async () => {
  try {
    await resetIfRequested();
    const state = await getVotesState();
    renderOptions(state);

    const browserId = await getBrowserFingerprint();
    const ballot = await hasVotedByCursorId(browserId);
    if (ballot) {
      renderResults(state, ballot, true);
    }

    // Real-time listener
    db.collection(VOTES_COLLECTION)
      .doc(VOTES_DOC)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const updatedState = doc.data();
          renderOptions(updatedState);
          if (ballot) {
            renderResults(updatedState, ballot, true);
          }
        }
      });
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error);
    elements.formError.textContent = "Erreur lors du chargement. Rechargez la page.";
  }
};

// Wait for Firebase to be ready, then init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

elements.voteForm.addEventListener("submit", submitVote);
