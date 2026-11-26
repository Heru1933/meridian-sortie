# meridian-sortie

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Heru1933/meridian-sortie/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Heru1933/meridian-sortie/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Meridian Sortie is a chase-view flight game over a procedural archipelago. Fly a light prop plane through glowing rings, mind your fuel, dodge the mountains, and put it down on the runway — three sorties, from a calm island hop to a storm run over the high ridge at dusk.

## How to play

- **Arrows / WASD** — pitch and roll
- **Shift** — throttle up, **Ctrl** — throttle down, **Space** — flaps/brake
- **Mouse** — steer gently (move the pointer off-centre), click to start/pause
- **P / Esc** — pause, **R** — restart
- **1 / 2 / 3** — buy an upgrade between sorties, **4** — skip

Fly through every ring in order (follow the yellow arrow), then land on the runway: slow, gentle, on the centreline. Three hard hits — or an empty tank — ends the sortie. Rings, time and landing quality earn points and stars; points buy upgrades between sorties.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 — or serve `game/` with any static server:

```sh
cd game && python3 -m http.server 8000
```

and open http://localhost:8000. No build step, no network requests, no external files.

## Structure

- `game/index.html` — page shell and canvas
- `game/style.css` — page chrome
- `game/src/config.js` — tuning constants, missions, skies
- `game/src/random.js` — seeded RNG and value noise
- `game/src/terrain.js` — procedural heightmap: sea, islands, canyon, river, road, runway
- `game/src/plane.js` — flight model, fuel and damage
- `game/src/render.js` — sky, projected terrain, rings, runway, aircraft
- `game/src/instruments.js` — HUD, cockpit gauges and screens
- `game/src/audio.js` — WebAudio synth: engine drone, wind, chimes
- `game/src/missions.js` — sorties, rings, scoring, stars
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|chase|rings|landing`)
- `game/src/main.js` — game loop, input and state machine
- `main.ts` — hand-in program (copies `game/` and `screenshots/`, writes `dossier.json`)
- `screenshots/` — real renders of the game

## make.fun

This game was built by an AI agent for the [make.fun](https://make.fun) bounty "Make the best flight game" (best-flight-game-20261126-0057), $500 in USDC.
