// Game entities: plain data objects plus the small behaviour each type
// needs. main.js owns the loop and collisions; this file owns what
// things are and how they move.
import { CONFIG } from './config.js';
import { clamp, rand } from './random.js';

export function createPlayer() {
  const p = CONFIG.player;
  return {
    x: CONFIG.W / 2,
    y: CONFIG.H - 120,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: p.radius,
    hull: p.maxHull,
    maxHull: p.maxHull,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashDirX: 0,
    dashDirY: -1,
    invuln: 0,
    thrust: 0, // 0..1, for the engine flame
    // Loadout, mutated by upgrades.
    damage: p.bulletDamage,
    fireInterval: p.fireInterval,
    projectiles: 1,
    pierce: 0,
    missiles: 0,
    missileTimer: 0,
    speedMul: 1,
    magnetMul: 1,
    regen: 0,
    regenTimer: 0,
    overdrive: 0, // 0 = not owned; else charge 0..1, surge while active
    overdriveActive: 0,
    alive: true,
  };
}

export function createBullet(x, y, vx, vy, damage, pierce, friendly, color) {
  return {
    x, y, vx, vy,
    damage,
    pierce,
    friendly,
    radius: friendly ? 4 : 5,
    color: color || (friendly ? '#7df9ff' : '#ff6b6b'),
    life: 3,
    dead: false,
  };
}

export function createMissile(x, y, target) {
  return {
    x, y,
    vx: 0, vy: -260,
    damage: 2,
    target,
    radius: 5,
    turn: 5.2,
    speed: 520,
    life: 2.5,
    dead: false,
  };
}

// Enemy kinds and their movement. `ctx` gives the update what it needs:
// { player, time, rng, fireEnemyBullet(x, y, vx, vy) }.
export function spawnEnemy(type, x, y, rng, wave) {
  const def = CONFIG.enemies[type];
  const hpScale = 1 + (wave - 1) * 0.12;
  const e = {
    type,
    x, y,
    vx: 0, vy: def.speed,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    score: def.score,
    color: def.color,
    t: rand(rng, 0, Math.PI * 2),
    baseX: x,
    fireTimer: rand(rng, 1, 2.5),
    burst: 0,
    phase: 0,
    flash: 0,
    dead: false,
    splits: type === 'splitter',
  };
  return e;
}

export function spawnBoss(x, y, wave) {
  const def = CONFIG.enemies.boss;
  const hpScale = 1 + (wave - 5) * 0.35;
  return {
    type: 'boss',
    x, y,
    vx: 0, vy: 0,
    radius: def.radius,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    score: def.score,
    color: def.color,
    t: 0,
    baseX: x,
    fireTimer: 1.5,
    burst: 0,
    phase: 0,
    flash: 0,
    dead: false,
    entered: false,
  };
}

export function updateEnemy(e, dt, ctx) {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt * 6);
  const p = ctx.player;
  switch (e.type) {
    case 'drone': {
      // Steers toward the player, with a wobble.
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = CONFIG.enemies.drone.speed;
      e.vx = (dx / d) * sp + Math.sin(e.t * 3) * 40;
      e.vy = (dy / d) * sp * 0.7 + 30;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      break;
    }
    case 'weaver': {
      // Sine drift across the screen, firing aimed shots.
      e.y += CONFIG.enemies.weaver.speed * dt;
      e.x = e.baseX + Math.sin(e.t * 2.2) * 130;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 0 && e.y < CONFIG.H * 0.7) {
        e.fireTimer = 2.2;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        ctx.fireEnemyBullet(e.x, e.y + e.radius, (dx / d) * 220, (dy / d) * 220);
        ctx.audio.enemyShoot();
      }
      break;
    }
    case 'tank': {
      e.y += CONFIG.enemies.tank.speed * dt;
      e.x = e.baseX + Math.sin(e.t * 0.8) * 40;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 0) {
        e.fireTimer = 3.2;
        // A 3-way fan, aimed loosely at the player.
        const base = Math.atan2(p.y - e.y, p.x - e.x);
        for (let i = -1; i <= 1; i++) {
          const a = base + i * 0.35;
          ctx.fireEnemyBullet(e.x, e.y + e.radius, Math.cos(a) * 180, Math.sin(a) * 180);
        }
        ctx.audio.enemyShoot();
      }
      break;
    }
    case 'splitter': {
      e.y += CONFIG.enemies.splitter.speed * dt;
      e.x = e.baseX + Math.sin(e.t * 3.5) * 70;
      break;
    }
    case 'boss': {
      updateBoss(e, dt, ctx);
      break;
    }
    default:
      e.y += e.vy * dt;
  }
  e.x = clamp(e.x, e.radius, CONFIG.W - e.radius);
}

function updateBoss(e, dt, ctx) {
  const p = ctx.player;
  // Phase 0: descend to the arena, then strafe and attack in cycles.
  if (!e.entered) {
    e.y += 60 * dt;
    if (e.y >= 130) {
      e.entered = true;
      e.phase = 1;
      e.fireTimer = 1;
    }
    return;
  }
  e.x = CONFIG.W / 2 + Math.sin(e.t * 0.55) * 380;
  e.y = 130 + Math.sin(e.t * 1.1) * 24;
  const hpFrac = e.hp / e.maxHp;
  e.fireTimer -= dt;
  if (e.fireTimer > 0) return;
  if (hpFrac > 0.66) {
    // Phase 1: aimed 5-way fan.
    e.fireTimer = 1.5;
    const base = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = -2; i <= 2; i++) {
      const a = base + i * 0.18;
      ctx.fireEnemyBullet(e.x, e.y + e.radius * 0.6, Math.cos(a) * 240, Math.sin(a) * 240);
    }
  } else if (hpFrac > 0.33) {
    // Phase 2: rotating spiral.
    e.fireTimer = 0.16;
    e.burst += 1;
    const a = e.burst * 0.55;
    ctx.fireEnemyBullet(e.x, e.y, Math.cos(a) * 200, Math.sin(a) * 200);
    ctx.fireEnemyBullet(e.x, e.y, Math.cos(a + Math.PI) * 200, Math.sin(a + Math.PI) * 200);
    if (e.burst % 24 === 0) e.fireTimer = 1.2;
  } else {
    // Phase 3: radial ring + aimed shots.
    e.fireTimer = 1.1;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + e.t;
      ctx.fireEnemyBullet(e.x, e.y, Math.cos(a) * 170, Math.sin(a) * 170);
    }
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.fireEnemyBullet(e.x, e.y + e.radius, (dx / d) * 300, (dy / d) * 300);
  }
  ctx.audio.enemyShoot();
}

export function createParticle(x, y, vx, vy, life, color, size) {
  return { x, y, vx, vy, life, maxLife: life, color, size, dead: false };
}

export function burstParticles(list, x, y, color, n, speed, rng) {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const s = rand(rng, speed * 0.25, speed);
    list.push(createParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(rng, 0.3, 0.8), color, rand(rng, 1.5, 3.5)));
  }
}

export function createFloatText(x, y, text, color) {
  return { x, y, text, color, life: 0.9, maxLife: 0.9, dead: false };
}

export function createPickup(x, y, kind, rng) {
  return {
    x, y,
    vx: rand(rng, -20, 20),
    vy: 70,
    kind,
    radius: 12,
    t: rand(rng, 0, Math.PI * 2),
    life: CONFIG.pickups.lifeTime,
    dead: false,
  };
}
