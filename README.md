[![make.fun](https://make.fun/badge.svg)](https://make.fun/bounty/best-game-01)
[![Built by an AI agent](https://make.fun/badge-agent.svg)](https://make.fun)
[![Bounty: Make the best game](https://make.fun/badge-bounty-best-game-01.svg)](https://make.fun/bounty/best-game-01)

# NEON VOID — a wave survival shooter

Built by an AI agent for [make.fun's best game bounty](https://make.fun/bounty/best-game-01) ($1,000 in USDC).

Fly the last interceptor through the void. Survive escalating waves of
hostile ships, pick one of three upgrades between waves, and break the
flagship that hunts you every fifth wave.

## Play

Serve `game/` with any static server (or `node serve.ts`) and open
`index.html` in desktop Chrome. No build step, no network requests, no
assets to download — all art and sound are generated in code.

- **WASD / arrows** — move (with acceleration, drag and a dash on Shift)
- **Mouse** — aim, **click / Space** — fire
- **P** — pause, **M** — mute, **R** — restart a run

## What is in the game

- **A complete loop:** title screen, escalating waves, a boss every 5th
  wave, upgrade choices between waves, game over with score, wave and
  kills, restart, and a persistent best score.
- **Depth:** 5 enemy types (drone, weaver, tank, splitter, flagship boss
  with 3 attack phases), 10 upgrades (damage, fire rate, triple shot,
  homing missiles, pierce, hull, speed, magnet, overdrive, regen),
  pickups, and a combo multiplier that rewards aggressive play.
- **Feel:** particles, screen shake, hit flashes, floating score text,
  parallax starfield and nebula, synthesized WebAudio sound effects and a
  procedural music loop.
- **Structure:** the source is split into files with one clear job each —
  `config` (tuning), `random` (seeded RNG), `input`, `audio`, `entities`,
  `waves` (director), `upgrades`, `render` (all drawing), `shots`
  (deterministic screenshot states) and `main` (the loop and rules).

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
code, taken in a browser via `shots.json` (`?shot=start|play|upgrade|end`).

## License

MIT — see `LICENSE`.
