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
const DEFAULT_PAIRS = [
  { dev: "MARS", prod: "VENUS" },
  { dev: "ZERO", prod: "PRIME" },
  { dev: "GAIA", prod: "FLORY" },
  { dev: "NANO", prod: "MACRO" },
  { dev: "NOVA", prod: "ASTRA" },
  { dev: "VIDA", prod: "SAMBA" },
  { dev: "MOMO", prod: "BENJI" },
  { dev: "DARK", prod: "VADOR" },
  { dev: "LOKI", prod: "RAGNA" },
];
const VOTES_DOC = "votes";
const VOTES_COLLECTION = "poll";
const BROWSER_ID_KEY = "browser_fingerprint_v1";
const ADMIN_PASSWORD = "LTS";

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
  pairsOptions: document.getElementById("pairs-options"),
  formError: document.getElementById("form-error"),
  voteForm: document.getElementById("vote-form"),
  results: document.getElementById("results"),
  pairResults: document.getElementById("pair-results"),
  ballotSummary: document.getElementById("ballot-summary"),
  alreadyVoted: document.getElementById("already-voted"),
  adminPanel: document.getElementById("admin-panel"),
  adminForm: document.getElementById("admin-form"),
  adminList: document.getElementById("admin-list"),
  adminDev: document.getElementById("admin-dev"),
  adminProd: document.getElementById("admin-prod"),
};

// === Utilities ===
const normalizeName = (value) => value.trim().toUpperCase();

const clearErrors = () => {
  elements.formError.textContent = "";
};

// === Admin Mode Detection ===
const isAdminMode = () => {
  const params = new URLSearchParams(globalThis.location.search);
  return params.get("admin") === ADMIN_PASSWORD;
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
    pairs: DEFAULT_PAIRS.map((pair) => ({
      dev: pair.dev,
      prod: pair.prod,
      votes: 0,
    })),
    voters: {},
    meta: {
      createdAt: new Date().toISOString(),
      version: 3,
    },
  };

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

const hasVotedByBrowserId = async (browserId) => {
  try {
    const state = await getVotesState();
    return state.voters[browserId] || null;
  } catch (error) {
    console.error("Erreur lors de la vérification du vote:", error);
    return null;
  }
};

// === Rendering Pairs ===
const renderPairs = (state, selectedIndex = null) => {
  elements.pairsOptions.innerHTML = "";

  state.pairs.forEach((pair, index) => {
    const card = document.createElement("label");
    card.className = "pair-card";
    if (selectedIndex === index) {
      card.classList.add("selected");
    }

    card.innerHTML = `
      <input type="radio" name="pair" value="${index}" ${selectedIndex === index ? "checked" : ""} />
      <div class="pair-name dev">${pair.dev}</div>
      <div class="pair-separator"></div>
      <div class="pair-name prod">${pair.prod}</div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".pair-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      card.querySelector("input").checked = true;
    });

    elements.pairsOptions.appendChild(card);
  });
};

// === Rendering Results ===
const renderResults = (state, ballot) => {
  elements.results.classList.remove("hidden");
  
  const votedPair = state.pairs[ballot.pairIndex];
  elements.ballotSummary.textContent = `Votre vote : ${votedPair.dev} / ${votedPair.prod}`;
  elements.alreadyVoted.classList.remove("hidden");

  elements.pairResults.innerHTML = "";
  const totalVotes = state.pairs.reduce((sum, pair) => sum + pair.votes, 0);

  state.pairs.forEach((pair, index) => {
    const percent = totalVotes === 0 ? 0 : Math.round((pair.votes / totalVotes) * 100);
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      <div class="result-header">
        <span>${pair.dev} / ${pair.prod}</span>
        <span>${percent}% • ${pair.votes} vote${pair.votes > 1 ? "s" : ""}</span>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${percent}%;"></div></div>
    `;
    elements.pairResults.appendChild(item);
  });

  // Auto-scroll to results
  setTimeout(() => {
    elements.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
};

// === Vote Submission ===
const submitVote = async (event) => {
  event.preventDefault();
  clearErrors();

  try {
    const browserId = await getBrowserFingerprint();
    const state = await getVotesState();

    const existingVote = await hasVotedByBrowserId(browserId);
    if (existingVote) {
      elements.formError.textContent = "Vous avez déjà voté sur ce navigateur.";
      renderPairs(state, existingVote.pairIndex);
      renderResults(state, existingVote);
      return;
    }

    const selectedPair = document.querySelector("input[name='pair']:checked");
    if (!selectedPair) {
      elements.formError.textContent = "Veuillez sélectionner une paire.";
      return;
    }

    const pairIndex = Number.parseInt(selectedPair.value);
    
    state.pairs[pairIndex].votes += 1;
    state.voters[browserId] = {
      pairIndex: pairIndex,
      at: new Date().toISOString(),
    };

    await saveVotesState(state);

    const ballot = { pairIndex };
    renderPairs(state, pairIndex);
    renderResults(state, ballot);
    elements.voteForm.querySelector("button[type='submit']").disabled = true;
  } catch (error) {
    console.error("Erreur lors du vote:", error);
    elements.formError.textContent = "Erreur lors de l'enregistrement du vote. Réessayez.";
  }
};

// === Admin Functions ===
const renderAdminList = (state) => {
  elements.adminList.innerHTML = "";

  if (state.pairs.length === 0) {
    elements.adminList.innerHTML = '<p class="hint">Aucune paire configurée.</p>';
    return;
  }

  state.pairs.forEach((pair, index) => {
    const item = document.createElement("div");
    item.className = "admin-pair-item";
    item.innerHTML = `
      <div class="admin-pair-names">
        <span>${pair.dev}</span>
        <span class="sep">/</span>
        <span>${pair.prod}</span>
        <span class="hint" style="margin-left: 12px;">(${pair.votes} vote${pair.votes > 1 ? "s" : ""})</span>
      </div>
      <button class="admin-delete-btn" data-index="${index}">Supprimer</button>
    `;

    item.querySelector(".admin-delete-btn").addEventListener("click", async () => {
      if (confirm(`Supprimer la paire ${pair.dev} / ${pair.prod} ?`)) {
        await deletePair(index);
      }
    });

    elements.adminList.appendChild(item);
  });
};

const addPair = async (dev, prod) => {
  try {
    const state = await getVotesState();
    
    // Check if pair already exists
    const exists = state.pairs.some((p) => p.dev === dev && p.prod === prod);
    if (exists) {
      alert("Cette paire existe déjà.");
      return;
    }

    state.pairs.push({ dev, prod, votes: 0 });
    await saveVotesState(state);
    
    renderPairs(state);
    renderAdminList(state);
    elements.adminDev.value = "";
    elements.adminProd.value = "";
  } catch (error) {
    console.error("Erreur lors de l'ajout de la paire:", error);
    alert("Erreur lors de l'ajout de la paire.");
  }
};

const deletePair = async (index) => {
  try {
    const state = await getVotesState();
    state.pairs.splice(index, 1);
    await saveVotesState(state);
    
    renderPairs(state);
    renderAdminList(state);
  } catch (error) {
    console.error("Erreur lors de la suppression de la paire:", error);
    alert("Erreur lors de la suppression de la paire.");
  }
};

const handleAdminSubmit = async (event) => {
  event.preventDefault();
  const dev = normalizeName(elements.adminDev.value);
  const prod = normalizeName(elements.adminProd.value);

  if (!dev || !prod) {
    alert("Veuillez remplir les deux champs.");
    return;
  }

  if (dev.length !== 4) {
    alert("Le nom DEV doit contenir exactement 4 caractères.");
    return;
  }

  if (prod.length !== 5) {
    alert("Le nom PROD doit contenir exactement 5 caractères.");
    return;
  }

  await addPair(dev, prod);
};

// === Reset for Testing ===
const resetIfRequested = async () => {
  const params = new URLSearchParams(globalThis.location.search);
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

    // Show admin panel if in admin mode
    if (isAdminMode()) {
      elements.adminPanel.classList.remove("hidden");
    }

    const state = await getVotesState();
    renderPairs(state);

    if (isAdminMode()) {
      renderAdminList(state);
    }

    const browserId = await getBrowserFingerprint();
    const ballot = await hasVotedByBrowserId(browserId);
    if (ballot) {
      renderPairs(state, ballot.pairIndex);
      renderResults(state, ballot);
      elements.voteForm.querySelector("button[type='submit']").disabled = true;
    }

    // Real-time listener
    db.collection(VOTES_COLLECTION)
      .doc(VOTES_DOC)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const updatedState = doc.data();
          const currentSelection = document.querySelector("input[name='pair']:checked");
          const selectedIndex = currentSelection ? Number.parseInt(currentSelection.value) : null;
          renderPairs(updatedState, selectedIndex);
          
          if (isAdminMode()) {
            renderAdminList(updatedState);
          }
          
          if (ballot) {
            renderResults(updatedState, ballot);
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

if (elements.adminForm) {
  elements.adminForm.addEventListener("submit", handleAdminSubmit);
}
