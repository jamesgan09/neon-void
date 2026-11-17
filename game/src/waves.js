// The wave director: builds each wave's spawn list from the wave number,
// drips enemies in over time, and knows when a wave (or a boss) is done.
import { CONFIG } from './config.js';
import { rand, randInt, pick } from './random.js';
import { spawnEnemy, spawnBoss } from './entities.js';

const WEIGHTS = [
  // [type, weight] — heavies join later, drones thin out.
  { type: 'drone', w: (wave) => Math.max(1, 10 - wave) },
  { type: 'weaver', w: (wave) => (wave >= 2 ? 5 : 0) },
  { type: 'splitter', w: (wave) => (wave >= 3 ? 4 : 0) },
  { type: 'tank', w: (wave) => (wave >= 4 ? 3 + wave * 0.2 : 0) },
];

export function isBossWave(wave) {
  return wave % CONFIG.wave.bossEvery === 0;
}

export function buildWaveList(wave, rng) {
  if (isBossWave(wave)) return [{ type: 'boss', at: 0 }];
  const count = CONFIG.wave.baseCount + (wave - 1) * CONFIG.wave.perWave;
  const list = [];
  for (let i = 0; i < count; i++) {
    const total = WEIGHTS.reduce((s, e) => s + e.w(wave), 0);
    let roll = rng() * total;
    let type = 'drone';
    for (const entry of WEIGHTS) {
      roll -= entry.w(wave);
      if (roll <= 0) {
        type = entry.type;
        break;
      }
    }
    list.push({ type, at: i * CONFIG.wave.spawnInterval });
  }
  return list;
}

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.queue = [];
    this.time = 0;
    this.wave = 0;
    this.boss = null;
    this.active = false;
  }

  startWave(wave) {
    this.wave = wave;
    this.queue = buildWaveList(wave, this.rng);
    this.time = 0;
    this.boss = null;
    this.active = true;
  }

  // Returns freshly spawned enemies this frame (possibly empty).
  update(dt) {
    if (!this.active) return [];
    this.time += dt;
    const out = [];
    while (this.queue.length > 0 && this.queue[0].at <= this.time) {
      const item = this.queue.shift();
      const x = item.type === 'boss'
        ? CONFIG.W / 2
        : rand(this.rng, 50, CONFIG.W - 50);
      const y = item.type === 'boss' ? -80 : rand(this.rng, -60, -20);
      if (item.type === 'boss') {
        this.boss = spawnBoss(x, y, this.wave);
        out.push(this.boss);
      } else {
        out.push(spawnEnemy(item.type, x, y, this.rng, this.wave));
      }
    }
    return out;
  }

  // A wave is clear when nothing is left to spawn and no enemy remains.
  get cleared() {
    return this.active && this.queue.length === 0 && this._enemiesLeft === 0;
  }

  setEnemiesLeft(n) {
    this._enemiesLeft = n;
  }
}

// Pick 3 distinct upgrades for the between-wave choice screen.
export function rollUpgradeChoices(rng, taken) {
  const pool = [];
  const counts = taken;
  // Weight down upgrades the player already stacked, so choices stay fresh.
  const entries = [
    'damage', 'firerate', 'spread', 'missiles', 'pierce',
    'shield', 'speed', 'magnet', 'overdrive', 'regen',
  ];
  for (const id of entries) {
    const n = counts[id] || 0;
    const w = n >= 4 ? 0.2 : n >= 2 ? 0.5 : 1;
    pool.push({ id, w });
  }
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const total = pool.reduce((s, e) => s + e.w, 0);
    let roll = rng() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].w;
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    choices.push(pool.splice(idx, 1)[0].id);
  }
  return choices;
}

export function randomSpawnX(rng) {
  return rand(rng, 50, CONFIG.W - 50);
}

export function pickPickupKind(rng) {
  const roll = rng();
  const c = CONFIG.pickups;
  if (roll < c.shield) return 'shield';
  if (roll < c.shield + c.repair) return 'repair';
  if (roll < c.shield + c.repair + c.overdrive) return 'overdrive';
  return 'score';
}
