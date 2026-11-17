// Deterministic screenshot states: `?shot=start|play|upgrade|end&seed=N`
// puts the game into a representative, reproducible frame and freezes it,
// so the screenshots are real renders of the game's own code.
import { CONFIG } from './config.js';
import { createPickup, spawnEnemy, createBullet } from './entities.js';

// Run the live game for `seconds` with scripted input: the ship strafes in
// a circle, aims at the nearest enemy and holds fire. The pilot is kept
// alive so the scene stays in the middle of a fight.
function simulateFight(game, seconds) {
  const steps = Math.round(seconds * 60);
  const dt = 1 / 60;
  const input = game.input;
  input.mouse.down = true;
  for (let i = 0; i < steps; i++) {
    const a = (i / 60) * 1.1;
    input.keys.clear();
    if (Math.cos(a) > 0.3) input.keys.add('KeyD');
    if (Math.cos(a) < -0.3) input.keys.add('KeyA');
    if (Math.sin(a) > 0.3) input.keys.add('KeyS');
    if (Math.sin(a) < -0.3) input.keys.add('KeyW');
    // Aim at the nearest enemy, else at the top of the screen.
    let tx = game.player.x;
    let ty = 120;
    let best = Infinity;
    for (const e of game.enemies) {
      const d = (e.x - game.player.x) ** 2 + (e.y - game.player.y) ** 2;
      if (d < best) {
        best = d;
        tx = e.x;
        ty = e.y;
      }
    }
    input.mouse.x = tx;
    input.mouse.y = ty;
    // Keep the pilot alive and the wave going for the shot.
    game.player.invuln = 1;
    game.player.hull = game.player.maxHull;
    game.update(dt);
    if (game.state !== 'playing') break;
  }
  input.mouse.down = false;
  input.keys.clear();
}

export function applyShotMode(game, shot, seed) {
  if (shot === 'start') {
    game.state = 'title';
    game.frozen = true;
    game.frozenTime = 6.2; // settled starfield, ship mid-bob
    return;
  }

  if (shot === 'play') {
    game.startRun();
    game._startWave(4);
    game.score = 1250;
    game.combo = 2.5;
    game.comboTimer = 2.0;
    simulateFight(game, 4.5);
    // Stage a full mid-fight frame: extra hostiles spread across the
    // arena, the ship low-center with a volley in flight.
    const extra = [
      ['weaver', 420, 150], ['tank', 760, 120], ['splitter', 1020, 220],
      ['drone', 250, 260], ['weaver', 900, 330],
    ];
    for (const [type, x, y] of extra) {
      game.enemies.push(spawnEnemy(type, x, y, game.rng, 4));
    }
    game.player.x = 560;
    game.player.y = 540;
    game.player.angle = -Math.PI / 2.3;
    for (let i = 0; i < 3; i++) {
      game.bullets.push(createBullet(560 + i * 8, 500 - i * 14, -40 + i * 40, -720, 1, 0, true));
    }
    // A couple of pickups drifting on screen for colour.
    game.pickups.push(createPickup(300, 420, 'shield', game.rng));
    game.pickups.push(createPickup(980, 300, 'overdrive', game.rng));
    game.frozen = true;
    game.frozenTime = game.time;
    return;
  }

  if (shot === 'upgrade') {
    game.startRun();
    game.wave = 1;
    game.score = 1250;
    game.kills = 12;
    game.combo = 1;
    // A few embers from the finished wave, then the choice screen.
    game._openUpgrades();
    game.frozen = true;
    game.frozenTime = 3.5;
    return;
  }

  if (shot === 'end') {
    game.startRun();
    game.score = 8740;
    game.wave = 6;
    game.kills = 83;
    game.best = 5200; // lower than the run, so NEW BEST shows
    game.player.hull = 0;
    game.player.alive = false;
    game._gameOver();
    game.frozen = true;
    game.frozenTime = game.time;
    return;
  }

  // Unknown shot: leave the title screen.
  game.state = 'title';
  game.frozen = true;
  game.frozenTime = 6.2;
}
