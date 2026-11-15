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

## Question board
Click **❓ Question board** (or press `Q`) on the wheel page; **🎡 Wheel**
(or `W`) goes back. Money is kept per team and shown on both pages.

- 5 categories × 6 questions: two rows of €100, two of €200, two of €300.
- Click a tile → the question pops up. **Show answer** (or `A`/space) reveals the answer.
- Click the team that answered correctly (or press `1`, `2`, …): the money is
  awarded automatically and the tile shows the team's colour.
  **✖ Nobody** (or `0`) marks the question as played; **Close** (Esc) leaves it open.
- Undoing a question award (✕ / **↶ Undo last** on the wheel page, marked ❓) puts
  the question back on the board.

### Editing the questions
Edit `questions.yaml` (category `name` + a list of `question`/`answer`).
The order sets the price: questions 1–2 = €100, 3–4 = €200, 5–6 = €300.

- **Hosted (GitHub Pages / any web server):** `questions.yaml` is loaded automatically.
- **Opened by double-click (file://):** browsers block reading local files, so
  click **📂 Load questions.yaml…** on the start screen once. The browser
  remembers it; load it again after changing the file.

The questions are copied into the game when you press **Start game** or
**↺ Reset board**.

### Picture questions
Add `image:` with the path to a picture file in this folder (relative to
`index.html`), e.g. put the file in `images/`:

```yaml
      - question: What is this plant?
        image: images/example-mistletoe.svg
        answer: Mistletoe
```

The picture appears under the question; click it (or tap) to show it full
screen, click again or press `Esc` to close. JPG, PNG, GIF, WEBP and SVG all
work. If the file is missing, the question shows a warning with the path.
Pictures can be combined with `spotify`/`audio`.

### Music questions
Add a song to any question; it plays through a **hidden** player, so the title
and artist are never shown on screen:

```yaml
      - question: 🎵 Name this song and the artist!
        spotify: https://open.spotify.com/track/0bYg9bo50gSsH3LtXe2SQn   # Spotify → Share → Copy Song Link
        start: 30          # optional: start at second 30
        answer: All I Want for Christmas Is You — Mariah Carey
```

The question shows **▶ Play / ⏸ Pause** and **⏮ Restart** (keyboard: `P`).
The music stops when the question is closed or answered.

- **Spotify** needs internet. Log in to Spotify (open.spotify.com) in the same
  browser before the quiz, otherwise Spotify only plays a 30-second preview.
- **Own file:** use `audio: music/song.mp3` instead (path relative to `index.html`).
  Works offline. Don't upload copyrighted MP3s to a public GitHub repo; keep
  them on the presenting laptop.

Extra controls:
- **Reveal solution** shows the whole sentence (nobody wins).
- **↺ Reset board** hides all letters, refills the wheel, makes all questions available again and sets all money to €0, keeping the teams.
- **⌂ New game** returns to the start screen.

The game auto-saves in the browser, so a page refresh does not lose progress
(use **Continue saved game** on the start screen), including a custom phrase.

## Host on GitHub Pages
1. Create a repository and upload all files of this folder (at the root).
2. Repository **Settings → Pages** → Source: *Deploy from a branch*,
   branch `main`, folder `/ (root)`.
3. The game is available at `https://<user>.github.io/<repo>/`.

> Note: on a public site anyone can read the answer in `config.js` and `questions.yaml`.

`lib/js-yaml.min.js` is the [js-yaml](https://github.com/nodeca/js-yaml) library (MIT license, see `lib/js-yaml.LICENSE`), included so no internet connection is needed.
