const STORAGE_KEY = "machine_naming_poll_v1";
const VOTED_KEY = "machine_naming_poll_v1_hasVoted";
const BALLOT_KEY = "machine_naming_poll_v1_ballot";
const VOTED_COOKIE = "machine_naming_poll_v1_voted";
const DEFAULT_OPTIONS = ["MARS", "VENUS"];
const DEV_NAME_LENGTH = 4;
const PROD_NAME_LENGTH = 5;

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

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  const initial = {
    options: [...DEFAULT_OPTIONS],
    votes: {
      DEV: {},
      PROD: {},
    },
    meta: {
      createdAt: new Date().toISOString(),
      version: 1,
    },
  };
  DEFAULT_OPTIONS.forEach((name) => {
    initial.votes.DEV[name] = 0;
    initial.votes.PROD[name] = 0;
  });
  return initial;
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const hasVoted = () => {
  const localFlag = localStorage.getItem(VOTED_KEY) === "true";
  const cookieFlag = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${VOTED_COOKIE}=`));
  return localFlag || cookieFlag;
};

const setVoted = (ballot) => {
  localStorage.setItem(VOTED_KEY, "true");
  localStorage.setItem(BALLOT_KEY, JSON.stringify(ballot));
  document.cookie = `${VOTED_COOKIE}=true; max-age=31536000; path=/; samesite=lax`;
};

const getBallot = () => {
  const stored = localStorage.getItem(BALLOT_KEY);
  if (!stored) return null;
  return JSON.parse(stored);
};

const clearErrors = () => {
  elements.devError.textContent = "";
  elements.prodError.textContent = "";
  elements.formError.textContent = "";
};

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

const renderResults = (state, ballot) => {
  elements.results.classList.remove("hidden");
  elements.ballotSummary.textContent = `Votre vote : DEV = ${ballot.DEV}, PROD = ${ballot.PROD}.`;
  elements.alreadyVoted.classList.toggle("hidden", !hasVoted());

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

const addOptionIfNeeded = (state, value) => {
  if (!state.options.includes(value)) {
    state.options.push(value);
    state.votes.DEV[value] = state.votes.DEV[value] || 0;
    state.votes.PROD[value] = state.votes.PROD[value] || 0;
  }
};

const submitVote = (event) => {
  event.preventDefault();
  clearErrors();

  const state = loadState();
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
    addOptionIfNeeded(state, devChoice);
  }

  if (prodInput.trim().length > 0) {
    const validation = validateName(prodInput, PROD_NAME_LENGTH);
    if (!validation.ok) {
      elements.prodError.textContent = "Nom PROD invalide (5 caractères requis).";
      return;
    }
    prodChoice = validation.value;
    addOptionIfNeeded(state, prodChoice);
  }

  if (!devChoice || !prodChoice) {
    elements.formError.textContent = "Vous devez voter pour DEV et PROD.";
    return;
  }

  if (devChoice.toUpperCase() === prodChoice.toUpperCase()) {
    elements.formError.textContent = "DEV et PROD doivent être différents.";
    return;
  }

  if (hasVoted()) {
    elements.formError.textContent = "Vous avez déjà voté sur ce navigateur.";
    return;
  }

  state.votes.DEV[devChoice] = (state.votes.DEV[devChoice] || 0) + 1;
  state.votes.PROD[prodChoice] = (state.votes.PROD[prodChoice] || 0) + 1;
  saveState(state);

  const ballot = { DEV: devChoice, PROD: prodChoice };
  setVoted(ballot);

  renderOptions(state);
  renderResults(state, ballot);
  elements.voteForm.reset();
};

const resetIfRequested = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "1") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VOTED_KEY);
    localStorage.removeItem(BALLOT_KEY);
    document.cookie = `${VOTED_COOKIE}=; max-age=0; path=/`;
  }
};

const init = () => {
  resetIfRequested();
  const state = loadState();
  renderOptions(state);

  const ballot = getBallot();
  if (ballot) {
    renderResults(state, ballot);
  }
};

init();

elements.voteForm.addEventListener("submit", submitVote);
