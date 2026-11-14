(() => {
  "use strict";

  // ---------- Configuration ----------
  const CFG = Object.assign({
    title: "Wheel of Fortune",
    sentence: "Merry Christmas",
    category: "",
    defaultTeams: ["Team 1", "Team 2"],
    maxTeams: 8,
    awards: [100, 200, 300],
    spinCost: 200,
    vowelCost: 700,
    letterReward: 100,
    spinSeconds: 5
  }, window.GAME_CONFIG || {});

  const VOWELS = ["A", "E", "I", "O", "U"];
  const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");
  const STORAGE_KEY = "wof-christmas-state";
  const STATE_VERSION = 2;
  const TEAM_COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#ecf0f1", "#ff69b4"];
  const SEGMENT_COLORS = ["#c0392b", "#1e8449", "#d4ac0d", "#1f618d", "#a93226", "#117a65", "#b9770e", "#6c3483"];
  const SPIN_COST = Number(CFG.spinCost) || 0;
  const VOWEL_COST = Number(CFG.vowelCost) || 0;
  const LETTER_REWARD = Number(CFG.letterReward) || 0;

  // Strip accents so é/ë/è count as E, etc.
  const norm = (c) => c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const isLetter = (c) => /^[A-Z]$/.test(norm(c));
  // Phrase comparison: trim, collapse whitespace, ignore case, accents and punctuation.
  const normPhrase = (s) => norm(String(s)).replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();

  const cleanPhrase = (s) => String(s || "").trim().replace(/\s+/g, " ");
  const CONFIG_SENTENCE = cleanPhrase(CFG.sentence);
  // The active phrase: from config.js, unless overridden on the start screen.
  let SENTENCE = CONFIG_SENTENCE;
  let SENTENCE_LETTERS = new Set();
  function setSentence(s) {
    SENTENCE = cleanPhrase(s);
    SENTENCE_LETTERS = new Set([...SENTENCE].filter(isLetter).map(norm));
  }
  setSentence(CONFIG_SENTENCE);
  const money = (n) => "€ " + Number(n).toLocaleString("nl-BE");

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    startScreen: $("start-screen"), gameScreen: $("game-screen"),
    startTitle: $("start-title"), gameTitle: $("game-title"),
    teamCount: $("team-count"), teamInputs: $("team-inputs"), configInfo: $("config-info"),
    phraseInput: $("phrase-input"), phraseShow: $("phrase-show"),
    btnStart: $("btn-start"), btnContinue: $("btn-continue"),
    btnResetBoard: $("btn-reset-board"), btnNewGame: $("btn-new-game"),
    category: $("category"), board: $("board"), wheel: $("wheel"), btnSpin: $("btn-spin"),
    message: $("message"), teams: $("teams"), btnNextTeam: $("btn-next-team"),
    btnVowel: $("btn-vowel"), btnGuess: $("btn-guess"),
    history: $("history"), btnUndo: $("btn-undo"),
    letters: $("letters"), btnSolve: $("btn-solve"),
    vowelModal: $("vowel-modal"), vowelButtons: $("vowel-buttons"), vowelPrompt: $("vowel-prompt"), btnVowelCancel: $("btn-vowel-cancel"),
    guessModal: $("guess-modal"), guessPrompt: $("guess-prompt"), guessInput: $("guess-input"),
    btnGuessOk: $("btn-guess-ok"), btnGuessCancel: $("btn-guess-cancel"),
    snow: $("snow"), confetti: $("confetti")
  };

  // ---------- State ----------
  // { v, sentence, teams:[{name,money}], active, used:[letters], solved, winner, log:[{team,amount}] }
  let state = null;
  let spinning = false;
  let rotation = 0;

  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };
  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return s && s.v === STATE_VERSION && typeof s.sentence === "string" && s.sentence && Array.isArray(s.teams) ? s : null;
    } catch (e) { return null; }
  };
  const clearSaved = () => { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ } };

  const wheelLetters = () => CONSONANTS.filter((c) => !state.used.includes(c));
  const vowelsLeft = () => VOWELS.filter((v) => !state.used.includes(v));
  const activeTeam = () => state.teams[state.active];
  const modalOpen = () => !el.vowelModal.classList.contains("hidden") || !el.guessModal.classList.contains("hidden");

  // ---------- Sound (tiny WebAudio beeps, no files needed) ----------
  let audioCtx = null;
  function tone(freq, dur = 0.15, type = "sine", when = 0, vol = 0.15) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime + when;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* audio not available */ }
  }
  const sndGood = (n = 1) => { for (let i = 0; i < Math.min(n, 8); i++) tone(880 + i * 60, 0.2, "triangle", i * 0.12); };
  const sndBad = () => { tone(180, 0.4, "sawtooth", 0, 0.12); tone(140, 0.5, "sawtooth", 0.25, 0.12); };
  const sndCash = () => { tone(1500, 0.08, "square", 0, 0.06); tone(2000, 0.15, "square", 0.08, 0.06); };
  const sndWin = () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", i * 0.15, 0.18));

  // ============================================================
  //  START SCREEN
  // ============================================================
  function initStartScreen() {
    document.title = CFG.title;
    el.startTitle.textContent = CFG.title;
    el.gameTitle.textContent = CFG.title;

    el.teamCount.innerHTML = "";
    for (let i = 1; i <= Math.max(1, CFG.maxTeams); i++) el.teamCount.add(new Option(String(i), String(i)));
    el.teamCount.value = String(Math.min(Math.max(1, CFG.defaultTeams.length || 2), CFG.maxTeams));
    el.teamCount.addEventListener("change", renderTeamInputs);
    renderTeamInputs();

    el.phraseInput.addEventListener("input", updatePhraseInfo);
    el.phraseShow.addEventListener("change", () => { el.phraseInput.type = el.phraseShow.checked ? "text" : "password"; });
    updatePhraseInfo();
    el.btnContinue.classList.toggle("hidden", !load());
  }

  const chosenPhrase = () => cleanPhrase(el.phraseInput.value) || CONFIG_SENTENCE;

  function updatePhraseInfo() {
    const phrase = chosenPhrase();
    const source = cleanPhrase(el.phraseInput.value) ? "custom phrase" : "config.js";
    const letterCount = [...phrase].filter(isLetter).length;
    el.configInfo.textContent = letterCount
      ? `Puzzle from ${source}: ${letterCount} letters, ${phrase.split(" ").length} words. ` +
        `Spin costs ${money(SPIN_COST)}, a vowel costs ${money(VOWEL_COST)}.`
      : "⚠ No phrase set — type one above or edit config.js!";
    el.btnStart.disabled = letterCount === 0;
  }

  function renderTeamInputs() {
    const n = parseInt(el.teamCount.value, 10);
    const existing = [...el.teamInputs.querySelectorAll("input")].map((i) => i.value);
    el.teamInputs.innerHTML = "";
    for (let i = 0; i < n; i++) {
      const label = document.createElement("label");
      const dot = document.createElement("span");
      dot.className = "team-dot";
      dot.style.background = TEAM_COLORS[i % TEAM_COLORS.length];
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 30;
      input.value = existing[i] ?? CFG.defaultTeams[i] ?? `Team ${i + 1}`;
      input.placeholder = `Team ${i + 1}`;
      label.append(dot, input);
      el.teamInputs.append(label);
    }
  }

  function startNewGame() {
    const names = [...el.teamInputs.querySelectorAll("input")].map((inp, i) => inp.value.trim() || `Team ${i + 1}`);
    setSentence(chosenPhrase());
    state = {
      v: STATE_VERSION, sentence: SENTENCE,
      teams: names.map((name) => ({ name, money: 0 })),
      active: 0, used: [], letterTeams: {}, solved: false, winner: null, log: []
    };
    save();
    showGame();
  }

  // ============================================================
  //  GAME SCREEN
  // ============================================================
  function showGame() {
    el.startScreen.classList.remove("active");
    el.gameScreen.classList.add("active");
    el.category.textContent = CFG.category || "";
    rotation = 0;
    el.wheel.style.transition = "none";
    el.wheel.style.transform = "rotate(0deg)";
    buildBoard();
    renderAll();
    if (state.solved) announceWinner(false);
    else setMessage(`Ask ${activeTeam().name} a question!`);
  }

  function showStart() {
    el.gameScreen.classList.remove("active");
    el.startScreen.classList.add("active");
    el.btnContinue.classList.toggle("hidden", !load());
  }

  function renderAll() {
    drawWheel();
    renderTeams();
    renderHistory();
    renderLetters();
    updateControls();
  }

  function setMessage(text, kind = "") {
    el.message.textContent = text;
    el.message.className = "message" + (kind ? " " + kind : "");
  }

  function updateControls() {
    const team = activeTeam();
    const busy = spinning || modalOpen();
    el.btnSpin.disabled = busy || state.solved || wheelLetters().length === 0 || team.money < SPIN_COST;
    el.btnSpin.title = team.money < SPIN_COST ? `Not enough money (spin costs ${money(SPIN_COST)})` : `Spin for ${money(SPIN_COST)} (space bar)`;
    el.btnVowel.disabled = busy || state.solved || vowelsLeft().length === 0 || team.money < VOWEL_COST;
    el.btnGuess.disabled = busy || state.solved;
    el.btnNextTeam.disabled = busy;
    el.btnSolve.disabled = busy || state.solved;
    el.btnUndo.disabled = busy || state.log.length === 0;
  }

  // ---------- Board ----------
  function buildBoard() {
    el.board.innerHTML = "";
    for (const w of SENTENCE.split(" ")) {
      const wordEl = document.createElement("div");
      wordEl.className = "word";
      for (const ch of w) {
        const tile = document.createElement("div");
        tile.className = "tile";
        const inner = document.createElement("div");
        inner.className = "tile-inner";
        const front = document.createElement("div");
        front.className = "tile-front";
        const back = document.createElement("div");
        back.className = "tile-back";
        back.textContent = ch.toUpperCase();
        inner.append(front, back);
        tile.append(inner);
        if (isLetter(ch)) {
          tile.dataset.letter = norm(ch);
          if (state.used.includes(norm(ch)) || state.solved) tile.classList.add("revealed");
          colorTile(tile, (state.letterTeams || {})[norm(ch)]);
        } else {
          tile.classList.add("punct");
        }
        wordEl.append(tile);
      }
      el.board.append(wordEl);
    }
    sizeBoard();
  }

  function sizeBoard() {
    const words = SENTENCE.split(" ");
    const longest = Math.max(1, ...words.map((w) => w.length));
    const totalLetters = SENTENCE.replace(/\s+/g, "").length;
    const width = el.board.clientWidth || window.innerWidth * 0.9;
    const byWord = (width - 40) / (longest * 1.1);
    const byTotal = Math.sqrt((width * window.innerHeight * 0.22) / Math.max(1, totalLetters * 1.6));
    const tile = Math.max(22, Math.min(72, byWord, byTotal));
    document.documentElement.style.setProperty("--tile", tile + "px");
  }

  // Border of a revealed tile shows the color of the team that found the letter.
  function colorTile(tile, teamIdx) {
    if (teamIdx === undefined || teamIdx === null) return;
    tile.style.setProperty("--team-color", TEAM_COLORS[teamIdx % TEAM_COLORS.length]);
    tile.classList.add("team-found");
  }

  function revealLetter(letter, teamIdx) {
    const tiles = [...el.board.querySelectorAll(`.tile[data-letter="${letter}"]`)];
    tiles.forEach((t, i) => setTimeout(() => {
      colorTile(t, teamIdx);
      t.classList.add("revealed", "flash");
      tone(1200, 0.08, "square", 0, 0.06);
    }, i * 350));
    return tiles.length;
  }

  const allLettersShown = () => [...SENTENCE_LETTERS].every((l) => state.used.includes(l));

  // ---------- Teams & money ----------
  function renderTeams() {
    el.teams.innerHTML = "";
    state.teams.forEach((t, i) => {
      const li = document.createElement("li");
      li.className = "team" + (i === state.active ? " active" : "");

      const top = document.createElement("div");
      top.className = "team-top";
      const dot = document.createElement("span");
      dot.className = "team-dot";
      dot.style.background = TEAM_COLORS[i % TEAM_COLORS.length];
      const name = document.createElement("span");
      name.className = "team-name";
      name.textContent = t.name;
      const amount = document.createElement("span");
      amount.className = "team-money";
      amount.textContent = money(t.money);
      top.append(dot, name, amount);

      const awards = document.createElement("div");
      awards.className = "team-awards";
      for (const a of CFG.awards) {
        const b = document.createElement("button");
        b.className = "award-btn";
        b.textContent = "+" + money(a);
        b.title = `Award ${money(a)} to ${t.name}`;
        b.addEventListener("click", (e) => { e.stopPropagation(); award(i, a); });
        awards.append(b);
      }

      li.append(top, awards);
      li.addEventListener("click", () => {
        if (spinning || modalOpen()) return;
        state.active = i; save(); renderTeams(); updateControls();
        setMessage(`${t.name}, it's your turn!`);
      });
      el.teams.append(li);
    });
  }

  function award(teamIdx, amount) {
    if (spinning || modalOpen()) return;
    const team = state.teams[teamIdx];
    team.money += amount;
    state.log.push({ team: teamIdx, amount });
    state.active = teamIdx;
    save();
    sndCash();
    setMessage(`Correct! +${money(amount)} for ${team.name} 💶`, "good");
    renderTeams(); renderHistory(); updateControls();
  }

  function undoAward(logIdx) {
    if (spinning || modalOpen()) return;
    const entry = state.log[logIdx];
    if (!entry) return;
    const team = state.teams[entry.team];
    // Money may already have been spent; balance never goes below zero.
    team.money = Math.max(0, team.money - entry.amount);
    state.log.splice(logIdx, 1);
    save();
    setMessage(`Reverted ${money(entry.amount)} for ${team.name}.`);
    renderTeams(); renderHistory(); updateControls();
  }

  function renderHistory() {
    el.history.innerHTML = "";
    if (state.log.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.textContent = "No awards yet";
      el.history.append(li);
      return;
    }
    state.log.slice(-6).reverse().forEach((entry, k) => {
      const idx = state.log.length - 1 - k;
      const li = document.createElement("li");
      const txt = document.createElement("span");
      txt.textContent = `+${money(entry.amount)} → ${state.teams[entry.team].name}`;
      const b = document.createElement("button");
      b.className = "score-btn";
      b.textContent = "✕";
      b.title = "Revert this award";
      b.addEventListener("click", () => undoAward(idx));
      li.append(txt, b);
      el.history.append(li);
    });
  }

  function nextTeam() {
    if (spinning || modalOpen()) return;
    state.active = (state.active + 1) % state.teams.length;
    save(); renderTeams(); updateControls();
    setMessage(`${activeTeam().name}, it's your turn!`);
  }

  // ---------- Letters overview ----------
  function renderLetters() {
    el.letters.innerHTML = "";
    for (const l of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const d = document.createElement("div");
      d.className = "letter";
      if (VOWELS.includes(l)) d.classList.add("vowel");
      if (state.used.includes(l)) {
        d.classList.add("used");
        if (SENTENCE_LETTERS.has(l)) d.classList.add("hit");
      }
      d.textContent = l;
      el.letters.append(d);
    }
  }

  // ---------- Wheel (only consonants not yet drawn) ----------
  function drawWheel() {
    const segments = wheelLetters();
    const canvas = el.wheel;
    const dpr = window.devicePixelRatio || 1;
    const size = 600;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (segments.length === 0) {
      ctx.beginPath();
      ctx.arc(r, r, r - 2, 0, Math.PI * 2);
      ctx.fillStyle = "#555";
      ctx.fill();
    }

    const seg = (Math.PI * 2) / Math.max(1, segments.length);
    segments.forEach((label, i) => {
      const start = -Math.PI / 2 + i * seg;
      ctx.beginPath();
      ctx.moveTo(r, r);
      ctx.arc(r, r, r - 2, start, start + seg);
      ctx.closePath();
      ctx.fillStyle = SEGMENT_COLORS[CONSONANTS.indexOf(label) % SEGMENT_COLORS.length];
      ctx.fill();
      if (segments.length > 1) {
        ctx.strokeStyle = "#f4c542";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(r, r);
      ctx.rotate(start + seg / 2);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${segments.length > 6 ? 40 : 56}px 'Segoe UI', sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,.6)";
      ctx.shadowBlur = 4;
      ctx.translate(r - 50, 0);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(r, r, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#f4c542";
    ctx.fill();
  }

  function spin() {
    if (spinning || !state || state.solved || modalOpen()) return;
    const team = activeTeam();
    const segments = wheelLetters();
    if (segments.length === 0) { setMessage("All consonants have been drawn — buy a vowel or guess!", "bad"); return; }
    if (team.money < SPIN_COST) { setMessage(`${team.name} needs ${money(SPIN_COST)} to spin (has ${money(team.money)}).`, "bad"); sndBad(); return; }

    team.money -= SPIN_COST;
    spinning = true;
    save(); renderTeams(); updateControls();
    setMessage(`${team.name} pays ${money(SPIN_COST)} and spins… 🎡`);

    const segDeg = 360 / segments.length;
    const idx = Math.floor(Math.random() * segments.length);
    const angle = idx * segDeg + segDeg * (0.15 + 0.7 * Math.random());
    const current = ((rotation % 360) + 360) % 360;
    const delta = ((360 - angle) - current + 720) % 360;
    rotation += 360 * (5 + Math.floor(Math.random() * 3)) + delta;

    const secs = Math.max(1, Number(CFG.spinSeconds) || 5);
    el.wheel.style.transition = `transform ${secs}s cubic-bezier(0.15, 0.6, 0.1, 1)`;
    el.wheel.style.transform = `rotate(${rotation}deg)`;
    let t = 0, gap = 0.04;
    while (t < secs - 0.3) { tone(600, 0.03, "square", t, 0.04); t += gap; gap *= 1.07; }
    setTimeout(() => { spinning = false; applyLetter(segments[idx], team); }, secs * 1000 + 150);
  }

  function applyLetter(letter, team) {
    state.used.push(letter);
    const teamIdx = state.teams.indexOf(team);
    state.letterTeams = state.letterTeams || {};
    state.letterTeams[letter] = teamIdx;
    const count = revealLetter(letter, teamIdx);
    const earned = count * LETTER_REWARD;
    team.money += earned;
    const left = ` ${team.name} now has ${money(team.money)}.`;
    if (count > 0) {
      setMessage(`${count}× "${letter}"! +${money(earned)} 🎉${left}`, "good");
      sndGood(count);
    } else {
      setMessage(`No "${letter}" in the puzzle… 😢${left}`, "bad");
      sndBad();
    }
    save();
    // The drawn letter disappears from the wheel; give the new layout a moment after the reveal.
    setTimeout(() => { if (state) { resetWheelRotation(); drawWheel(); } }, 1200);
    renderTeams(); renderLetters(); updateControls();
    if (allLettersShown()) setTimeout(() => finish(null), 350 * count + 400);
  }

  function resetWheelRotation() {
    rotation = 0;
    el.wheel.style.transition = "none";
    el.wheel.style.transform = "rotate(0deg)";
  }

  // ---------- Buy a vowel ----------
  function openVowelModal() {
    if (spinning || state.solved || modalOpen()) return;
    const team = activeTeam();
    if (team.money < VOWEL_COST) { setMessage(`${team.name} needs ${money(VOWEL_COST)} for a vowel.`, "bad"); return; }
    el.vowelPrompt.textContent = `${team.name}, choose a vowel (${money(VOWEL_COST)}):`;
    el.vowelButtons.innerHTML = "";
    for (const v of VOWELS) {
      const b = document.createElement("button");
      b.textContent = v;
      b.disabled = state.used.includes(v);
      b.addEventListener("click", () => buyVowel(v));
      el.vowelButtons.append(b);
    }
    el.vowelModal.classList.remove("hidden");
    updateControls();
  }

  function buyVowel(v) {
    const team = activeTeam();
    if (state.used.includes(v) || team.money < VOWEL_COST) return;
    el.vowelModal.classList.add("hidden");
    team.money -= VOWEL_COST;
    applyLetter(v, team);
  }

  function closeVowelModal() { el.vowelModal.classList.add("hidden"); updateControls(); }

  // ---------- Guess the phrase ----------
  function openGuessModal() {
    if (spinning || state.solved || modalOpen()) return;
    el.guessPrompt.textContent = `${activeTeam().name}, what is the phrase?`;
    el.guessInput.value = "";
    el.guessModal.classList.remove("hidden");
    updateControls();
    el.guessInput.focus();
  }

  function closeGuessModal() { el.guessModal.classList.add("hidden"); updateControls(); }

  function submitGuess() {
    const guess = normPhrase(el.guessInput.value);
    if (!guess) { el.guessInput.focus(); return; }
    closeGuessModal();
    const team = activeTeam();
    if (guess === normPhrase(SENTENCE)) {
      finish(state.active);
    } else {
      setMessage(`"${el.guessInput.value.trim().replace(/\s+/g, " ")}" is wrong, ${team.name}! ❌`, "bad");
      sndBad();
    }
  }

  // ---------- End of game ----------
  function finish(winnerIdx) {
    state.solved = true;
    state.winner = winnerIdx;
    save();
    [...el.board.querySelectorAll(".tile[data-letter]")].forEach((t) => t.classList.add("revealed"));
    announceWinner(true);
    updateControls();
  }

  function announceWinner(celebrate) {
    if (state.winner !== null && state.winner !== undefined) {
      setMessage(`🎉 ${state.teams[state.winner].name} guessed the phrase and wins!`, "good");
    } else {
      setMessage("The phrase is revealed!", "good");
    }
    if (celebrate) { sndWin(); confetti(); }
  }

  function revealSolution() {
    if (!confirm("Reveal the full solution (nobody wins)?")) return;
    finish(null);
  }

  function confetti() {
    const colors = ["#e74c3c", "#f4c542", "#2ecc71", "#fff", "#3498db"];
    for (let i = 0; i < 150; i++) {
      const p = document.createElement("div");
      p.className = "confetti-piece";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
      p.style.animationDelay = Math.random() * 1.5 + "s";
      el.confetti.append(p);
      setTimeout(() => p.remove(), 7000);
    }
  }

  // ---------- Resets ----------
  function resetBoard() {
    if (spinning) return;
    if (!confirm("Reset the board? Letters are hidden again, the wheel is refilled and all money is set to € 0 (teams are kept).")) return;
    Object.assign(state, { used: [], letterTeams: {}, solved: false, winner: null, active: 0, log: [] });
    state.teams.forEach((t) => (t.money = 0));
    save();
    showGame();
  }

  function newGame() {
    if (spinning) return;
    if (!confirm("Go back to the start screen? The current game will be discarded.")) return;
    clearSaved();
    state = null;
    el.vowelModal.classList.add("hidden");
    el.guessModal.classList.add("hidden");
    showStart();
  }

  // ---------- Snow ----------
  function makeSnow() {
    for (let i = 0; i < 45; i++) {
      const f = document.createElement("span");
      f.className = "flake";
      f.textContent = "❄";
      f.style.left = Math.random() * 100 + "vw";
      f.style.fontSize = 8 + Math.random() * 14 + "px";
      f.style.animationDuration = 8 + Math.random() * 12 + "s";
      f.style.animationDelay = -Math.random() * 20 + "s";
      el.snow.append(f);
    }
  }

  // ---------- Wiring ----------
  el.btnStart.addEventListener("click", startNewGame);
  el.btnContinue.addEventListener("click", () => { state = load(); if (state) { setSentence(state.sentence); showGame(); } });
  el.btnSpin.addEventListener("click", spin);
  el.btnNextTeam.addEventListener("click", nextTeam);
  el.btnVowel.addEventListener("click", openVowelModal);
  el.btnVowelCancel.addEventListener("click", closeVowelModal);
  el.btnGuess.addEventListener("click", openGuessModal);
  el.btnGuessOk.addEventListener("click", submitGuess);
  el.btnGuessCancel.addEventListener("click", closeGuessModal);
  el.btnUndo.addEventListener("click", () => undoAward(state.log.length - 1));
  el.btnSolve.addEventListener("click", revealSolution);
  el.btnResetBoard.addEventListener("click", resetBoard);
  el.btnNewGame.addEventListener("click", newGame);
  window.addEventListener("resize", () => { if (state) sizeBoard(); });
  document.addEventListener("keydown", (e) => {
    if (!state || !el.gameScreen.classList.contains("active")) return;
    if (!el.guessModal.classList.contains("hidden")) {
      if (e.key === "Enter") submitGuess();
      if (e.key === "Escape") closeGuessModal();
      return;
    }
    if (!el.vowelModal.classList.contains("hidden")) {
      const v = e.key.toUpperCase();
      if (VOWELS.includes(v)) buyVowel(v);
      if (e.key === "Escape") closeVowelModal();
      return;
    }
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); spin(); }
    if (e.key === "n" || e.key === "N") nextTeam();
  });

  makeSnow();
  initStartScreen();
})();
