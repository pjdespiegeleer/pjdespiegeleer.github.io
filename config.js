// ============================================================
//  GAME CONFIGURATION — edit this file to set up your game.
// ============================================================
window.GAME_CONFIG = {
  // Title shown on the start screen and in the header.
  title: "Wheel of Fortune — Christmas Edition",

  // The sentence the audience has to guess.
  // Letters (also accented ones like é, ë) are hidden; spaces and
  // punctuation (, . ! ? ' - etc.) are always shown.
  sentence: "Merry Christmas and a happy new year!",

  // Optional hint/category shown above the board (leave "" for none).
  category: "",

  // Default team names pre-filled on the start screen
  // (the number of names = default number of teams).
  defaultTeams: ["Team Rudolph", "Team Frosty"],

  // Maximum number of teams that can be selected on the start screen.
  maxTeams: 8,

  // Money (in euro).
  awards: [100, 200, 300],   // buttons to reward a correct answer
  spinCost: 200,             // price of one spin of the wheel
  vowelCost: 700,            // price of buying one vowel
  letterReward: 100,         // earned per occurrence of a revealed letter

  // How long the wheel spins, in seconds.
  spinSeconds: 4
};
