# 🎄 Wheel of Fortune — Christmas Edition

A static browser game (HTML/CSS/JS, no build step, no server needed).

## Set up the puzzle
Open `config.js` and change `sentence` (and optionally `title`, `category`,
`defaultTeams`, `awards`, `spinCost`, `vowelCost`, `spinSeconds`).
Save and refresh the page.

You can also type a phrase on the start screen (field **Phrase**, hidden by
default so the audience can't read it; tick **show** to check it). If filled
in, it overrides the phrase from `config.js` for that game.

## Play
1. Open `index.html` in a browser (double-click works) or host it (see below).
2. Start screen: choose the number of teams (default 2) and their names → **Start game**.
3. Ask a team a question. If correct, click **+€100 / +€200 / +€300** under that
   team depending on the difficulty. A mistake? Click **✕** next to the award in
   *Recent awards* (or **↶ Undo last**).
4. The active team (highlighted; click a team to select it) may then:
   - **SPIN** (€200, or press the space bar) — as often as they can afford.
     Every occurrence of the consonant is revealed and that letter is removed
     from the wheel, so it can't come up again.
   - **Buy vowel** (€700) — pick A/E/I/O/U (click or type it).
   - **Guess the phrase** — type the phrase; leading/trailing spaces, double
     spaces, case, accents and punctuation are ignored. A correct guess wins.
5. Every revealed letter earns the team €100 per occurrence (e.g. 3× E = €300),
   for both spun consonants and bought vowels.
6. **Next team** (or `N`) passes the turn.

Extra controls:
- **Reveal solution** shows the whole sentence (nobody wins).
- **↺ Reset board** hides all letters, refills the wheel and sets all money to €0, keeping the teams.
- **⌂ New game** returns to the start screen.

The game auto-saves in the browser, so a page refresh does not lose progress
(use **Continue saved game** on the start screen), including a custom phrase.

## Host on GitHub Pages
1. Create a repository and upload all files of this folder (at the root).
2. Repository **Settings → Pages** → Source: *Deploy from a branch*,
   branch `main`, folder `/ (root)`.
3. The game is available at `https://<user>.github.io/<repo>/`.

> Note: on a public site anyone can read the answer in `config.js`.
