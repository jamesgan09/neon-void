// NEON VOID — the game itself: state machine, loop, physics, collisions,
// scoring and wave flow. Rendering lives in render.js, tuning in config.js.
import { CONFIG } from './config.js';
import { clamp, mulberry32, rand } from './random.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { loadBest, saveBest } from './storage.js';
import {
  createPlayer, createBullet, createMissile, createParticle, createFloatText,
  createPickup, burstParticles, updateEnemy,
} from './entities.js';
import { WaveDirector, isBossWave, rollUpgradeChoices, pickPickupKind } from './waves.js';
import { applyUpgrade, upgradeById } from './upgrades.js';
import * as Render from './render.js';

const STATES = ['title', 'playing', 'upgrade', 'paused', 'gameover'];

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.rng = mulberry32(opts.seed ?? ((Math.random() * 0xffffffff) >>> 0));
    this.best = loadBest();
    this.frozen = false;
    this.frozenTime = 0;
    this.reset();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.state = 'paused';
    });
    canvas.addEventListener('click', () => this._onClick());
    this.input.onKey = (code) => this._onKey(code);
  }

  reset() {
    this.state = 'title';
    this.time = 0;
    this.scrollY = 0;
    this.score = 0;
    this.wave = 0;
    this.kills = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.player = createPlayer();
    this.bullets = [];
    this.enemyBullets = [];
    this.missiles = [];
    this.enemies = [];
    this.particles = [];
    this.texts = [];
    this.pickups = [];
    this.director = new WaveDirector(this.rng);
    this.boss = null;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.banner = '';
    this.bannerAlpha = 0;
    this.intermission = 0;
    this.upgradeChoices = [];
    this.upgradeChoicesMeta = [];
    this.upgradeTaken = {};
    this.upgradeSelected = 0;
    this.upgradeCards = [];
    this.stars = this._makeStars();
    this.last = performance.now();
  }

  _makeStars() {
    return CONFIG.stars.map((layer) => ({
      factor: layer.factor,
      stars: Array.from({ length: layer.count }, () => ({
        x: rand(this.rng, 0, CONFIG.W),
        y: rand(this.rng, 0, CONFIG.H),
        size: layer.size,
        alpha: rand(this.rng, 0.4, 1),
        tw: rand(this.rng, 0.5, 2.5),
        phase: rand(this.rng, 0, Math.PI * 2),
      })),
    }));
  }

  _resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = CONFIG.W * dpr;
    this.canvas.height = CONFIG.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // CSS keeps the canvas fitted to the window with letterboxing.
    const scale = Math.min(window.innerWidth / CONFIG.W, window.innerHeight / CONFIG.H);
    this.canvas.style.width = `${Math.floor(CONFIG.W * scale)}px`;
    this.canvas.style.height = `${Math.floor(CONFIG.H * scale)}px`;
  }

  // ---------------------------------------------------------- flow

  startRun() {
    this.audio.unlock();
    this.reset();
    this.state = 'playing';
    this._startWave(1);
  }

  _startWave(n) {
    this.wave = n;
    this.director.startWave(n);
    this.banner = isBossWave(n) ? 'FLAGSHIP APPROACHES' : `WAVE ${n}`;
    this.bannerAlpha = 1;
    if (isBossWave(n)) this.audio.bossAlarm();
  }

  _waveCleared() {
    this.audio.waveClear();
    this.intermission = CONFIG.wave.intermission;
    this.state = 'upgrade-pending';
    this.banner = `WAVE ${this.wave} CLEARED`;
    this.bannerAlpha = 1;
  }

  _openUpgrades() {
    this.banner = '';
    this.bannerAlpha = 0;
    this.upgradeChoices = rollUpgradeChoices(this.rng, this.upgradeTaken);
    this.upgradeChoicesMeta = this.upgradeChoices.map(upgradeById);
    this.upgradeSelected = 0;
    this.state = 'upgrade';
  }

  _chooseUpgrade(i) {
    const id = this.upgradeChoices[i];
    if (!id) return;
    applyUpgrade(this.player, id);
    this.upgradeTaken[id] = (this.upgradeTaken[id] || 0) + 1;
    this.audio.upgrade();
    burstParticles(this.particles, this.player.x, this.player.y, '#7df9ff', 24, 220, this.rng);
    this.state = 'playing';
    this._startWave(this.wave + 1);
  }

  _gameOver() {
    this.state = 'gameover';
    this.banner = '';
    this.bannerAlpha = 0;
    this.audio.gameOver();
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.score);
    }
    burstParticles(this.particles, this.player.x, this.player.y, '#ff5d8f', 70, 320, this.rng);
    this.shake = CONFIG.shake.playerHit;
  }

  // ---------------------------------------------------------- input

  _onKey(code) {
    this.audio.unlock();
    if (code === 'KeyM') {
      this.audio.setMuted(!this.audio.muted);
      return;
    }
    if (this.state === 'title' && (code === 'Enter' || code === 'Space')) {
      this.startRun();
      return;
    }
    if (this.state === 'gameover' && (code === 'Enter' || code === 'Space')) {
      this.startRun();
      return;
    }
    if (this.state === 'playing' && code === 'KeyP') {
      this.state = 'paused';
      return;
    }
    if (this.state === 'paused') {
      if (code === 'KeyP') this.state = 'playing';
      if (code === 'KeyR') this.startRun();
      return;
    }
    if (this.state === 'upgrade') {
      if (code === 'Digit1') this._chooseUpgrade(0);
      if (code === 'Digit2') this._chooseUpgrade(1);
      if (code === 'Digit3') this._chooseUpgrade(2);
      if (code === 'ArrowLeft' || code === 'KeyA') this.upgradeSelected = (this.upgradeSelected + 2) % 3;
      if (code === 'ArrowRight' || code === 'KeyD') this.upgradeSelected = (this.upgradeSelected + 1) % 3;
      if (code === 'Enter' || code === 'Space') this._chooseUpgrade(this.upgradeSelected);
    }
  }

  _onClick() {
    this.audio.unlock();
    if (this.state === 'title' || this.state === 'gameover') {
      this.startRun();
      return;
    }
    if (this.state === 'upgrade') {
      const m = this.input.mouse;
      for (const card of this.upgradeCards) {
        if (m.x >= card.x && m.x <= card.x + card.w && m.y >= card.y && m.y <= card.y + card.h) {
          this._chooseUpgrade(card.index);
          return;
        }
      }
    }
  }

  // ---------------------------------------------------------- loop

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    if (!this.frozen) {
      this.time += dt;
      this.update(dt);
    }
    this.render();
    this.input.endFrame();
  }

  update(dt) {
    this.scrollY += dt * 40;
    this.bannerAlpha = Math.max(0, this.bannerAlpha - dt * 0.55);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.shakeX = (this.rng() * 2 - 1) * this.shake;
    this.shakeY = (this.rng() * 2 - 1) * this.shake;

    if (this.state === 'playing' || this.state === 'upgrade-pending') {
      this._updatePlaying(dt);
    }
    // Particles and floating text drift on every screen, so menus feel alive.
    this._updateFx(dt);
    if (this.state === 'title') {
      // Ambient drift behind the title.
      if (this.rng() < dt * 2) {
        this.particles.push(createParticle(
          rand(this.rng, 0, CONFIG.W), CONFIG.H + 10,
          rand(this.rng, -12, 12), rand(this.rng, -60, -25),
          rand(this.rng, 2, 4), '#7df9ff', rand(this.rng, 1, 2.5),
        ));
      }
    }
  }

  _updatePlaying(dt) {
    const p = this.player;
    if (!p.alive) return;

    // Combo decay.
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 1;

    // --- Player movement (acceleration + drag, dash on Shift) ---
    const mv = this.input.moveVector();
    p.thrust = Math.hypot(mv.x, mv.y) > 0 ? 1 : 0;
    if (this.input.wasPressed('ShiftLeft') || this.input.wasPressed('ShiftRight')) {
      if (p.dashCooldown <= 0) {
        p.dashTimer = CONFIG.player.dashTime;
        p.dashCooldown = CONFIG.player.dashCooldown;
        p.dashDirX = mv.x !== 0 || mv.y !== 0 ? mv.x : Math.sin(p.angle);
        p.dashDirY = mv.x !== 0 || mv.y !== 0 ? mv.y : -Math.cos(p.angle);
        p.invuln = Math.max(p.invuln, CONFIG.player.dashTime + 0.05);
        this.audio.dash();
      }
    }
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    const speed = CONFIG.player.speed * p.speedMul;
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashDirX * CONFIG.player.dashSpeed;
      p.vy = p.dashDirY * CONFIG.player.dashSpeed;
      if (this.rng() < dt * 60) {
        this.particles.push(createParticle(p.x, p.y, -p.vx * 0.1, -p.vy * 0.1, 0.3, '#7df9ff', 3));
      }
    } else {
      p.vx += mv.x * CONFIG.player.accel * dt;
      p.vy += mv.y * CONFIG.player.accel * dt;
      const drag = Math.exp(-CONFIG.player.drag * dt);
      p.vx *= drag;
      p.vy *= drag;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > speed) {
        p.vx = (p.vx / sp) * speed;
        p.vy = (p.vy / sp) * speed;
      }
    }
    p.x = clamp(p.x + p.vx * dt, p.radius, CONFIG.W - p.radius);
    p.y = clamp(p.y + p.vy * dt, p.radius, CONFIG.H - p.radius);
    p.angle = Math.atan2(this.input.mouse.y - p.y, this.input.mouse.x - p.x);

    // Regen.
    if (p.regen > 0) {
      p.regenTimer += dt;
      if (p.regenTimer >= 2 && p.hull < p.maxHull) {
        p.regenTimer = 0;
        p.hull = Math.min(p.maxHull, p.hull + 1);
        this.texts.push(createFloatText(p.x, p.y - 24, '+1 HULL', '#5dff8f'));
      }
    }

    // Overdrive surge.
    if (p.overdriveActive > 0) {
      p.overdriveActive -= dt;
    } else if (p.overdrive >= 1) {
      p.overdrive = 0;
      p.overdriveActive = 6;
      this.texts.push(createFloatText(p.x, p.y - 30, 'OVERDRIVE!', '#ffb020'));
    }

    // --- Firing ---
    p.fireTimer -= dt;
    const firing = this.input.firing && this.state === 'playing';
    if (firing && p.fireTimer <= 0) {
      const interval = p.fireInterval * (p.overdriveActive > 0 ? 0.6 : 1);
      p.fireTimer = interval;
      const dmg = p.damage * (p.overdriveActive > 0 ? 2 : 1);
      const n = p.projectiles;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.13;
        const a = p.angle + off;
        const sx = p.x + Math.cos(p.angle) * 18;
        const sy = p.y + Math.sin(p.angle) * 18;
        this.bullets.push(createBullet(
          sx, sy,
          Math.cos(a) * CONFIG.player.bulletSpeed,
          Math.sin(a) * CONFIG.player.bulletSpeed,
          dmg, p.pierce, true,
        ));
      }
      this.audio.shoot();
      // Recoil + muzzle flash.
      p.vx -= Math.cos(p.angle) * 14;
      p.vy -= Math.sin(p.angle) * 14;
      burstParticles(this.particles, p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, '#7df9ff', 2, 90, this.rng);
    }
    // Homing missiles.
    if (p.missiles > 0) {
      p.missileTimer -= dt;
      if (p.missileTimer <= 0 && this.enemies.length > 0) {
        p.missileTimer = 0.9;
        for (let i = 0; i < p.missiles; i++) {
          const target = this.enemies[Math.floor(this.rng() * this.enemies.length)];
          this.missiles.push(createMissile(p.x, p.y - 10, target));
        }
        this.audio.shoot();
      }
    }

    // --- Spawning ---
    if (this.state === 'playing') {
      const spawned = this.director.update(dt);
      for (const e of spawned) {
        this.enemies.push(e);
        if (e.type === 'boss') this.boss = e;
      }
    }

    // --- Enemies ---
    const ctx = {
      player: p,
      rng: this.rng,
      audio: this.audio,
      fireEnemyBullet: (x, y, vx, vy) => {
        this.enemyBullets.push(createBullet(x, y, vx, vy, 1, 0, false, '#ff6b6b'));
      },
    };
    for (const e of this.enemies) updateEnemy(e, dt, ctx);

    // --- Bullets ---
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > CONFIG.W + 20 || b.y < -20 || b.y > CONFIG.H + 20 || b.life <= 0) b.dead = true;
    }
    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > CONFIG.W + 20 || b.y < -20 || b.y > CONFIG.H + 20 || b.life <= 0) b.dead = true;
    }
    for (const m of this.missiles) {
      if (m.target && !m.target.dead) {
        const want = Math.atan2(m.target.y - m.y, m.target.x - m.x);
        const cur = Math.atan2(m.vy, m.vx);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const na = cur + clamp(diff, -m.turn * dt, m.turn * dt);
        m.vx = Math.cos(na) * m.speed;
        m.vy = Math.sin(na) * m.speed;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
      if (m.life <= 0 || m.x < -30 || m.x > CONFIG.W + 30 || m.y < -30 || m.y > CONFIG.H + 30) m.dead = true;
      if (this.rng() < dt * 40) {
        this.particles.push(createParticle(m.x, m.y, 0, 0, 0.25, '#ffb020', 2));
      }
    }

    this._collide(dt);

    // --- Pickups ---
    const magnetR = CONFIG.player.magnetRadius * p.magnetMul;
    for (const pk of this.pickups) {
      pk.t += dt;
      pk.life -= dt;
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const d = Math.hypot(dx, dy);
      if (d < magnetR && d > 1) {
        pk.vx += (dx / d) * 700 * dt;
        pk.vy += (dy / d) * 700 * dt;
      }
      pk.x += pk.vx * dt;
      pk.y += pk.vy * dt;
      if (pk.life <= 0) pk.dead = true;
      if (d < p.radius + pk.radius + 6) {
        pk.dead = true;
        this._collectPickup(pk);
      }
    }

    // --- Sweep dead ---
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.enemyBullets = this.enemyBullets.filter((b) => !b.dead);
    this.missiles = this.missiles.filter((m) => !m.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.pickups = this.pickups.filter((pk) => !pk.dead);
    if (this.boss && this.boss.dead) this.boss = null;

    // --- Wave clear? ---
    this.director.setEnemiesLeft(this.enemies.length);
    if (this.state === 'playing' && this.director.cleared) {
      this._waveCleared();
    }
    if (this.state === 'upgrade-pending') {
      this.intermission -= dt;
      if (this.intermission <= 0) this._openUpgrades();
    }
  }

  _collide(dt) {
    const p = this.player;
    // Player bullets vs enemies.
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const rr = e.radius + b.radius;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          e.hp -= b.damage;
          e.flash = 1;
          b.pierce -= 1;
          if (b.pierce < 0) b.dead = true;
          burstParticles(this.particles, b.x, b.y, e.color, CONFIG.particles.hit, 120, this.rng);
          this.audio.hit();
          if (e.hp <= 0) this._killEnemy(e);
          if (b.dead) break;
        }
      }
    }
    // Missiles vs enemies.
    for (const m of this.missiles) {
      if (m.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const rr = e.radius + m.radius;
        if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 < rr * rr) {
          e.hp -= m.damage;
          e.flash = 1;
          m.dead = true;
          burstParticles(this.particles, m.x, m.y, '#ffb020', 8, 160, this.rng);
          if (e.hp <= 0) this._killEnemy(e);
          break;
        }
      }
    }
    // Enemy bullets vs player.
    if (p.invuln <= 0) {
      for (const b of this.enemyBullets) {
        if (b.dead) continue;
        const rr = p.radius + b.radius - 2;
        if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < rr * rr) {
          b.dead = true;
          this._hurtPlayer();
          break;
        }
      }
    }
    // Enemies vs player (contact).
    if (p.invuln <= 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const rr = p.radius + e.radius - 2;
        if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < rr * rr) {
          if (e.type !== 'boss') {
            e.hp -= 3;
            e.flash = 1;
            if (e.hp <= 0) this._killEnemy(e);
          }
          this._hurtPlayer();
          break;
        }
      }
    }
  }

  _killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills += 1;
    // Combo grows with each kill inside the window.
    this.combo = Math.min(CONFIG.comboMax, this.combo + CONFIG.comboStep);
    this.comboTimer = CONFIG.comboWindow;
    const gained = Math.round(e.score * this.combo);
    this.score += gained;
    this.texts.push(createFloatText(e.x, e.y - e.radius - 6, `+${gained}`, e.color));
    const big = e.type === 'boss' || e.type === 'tank';
    burstParticles(this.particles, e.x, e.y, e.color, big ? CONFIG.particles.explosion : CONFIG.particles.kill, big ? 320 : 220, this.rng);
    this.shake = Math.max(this.shake, big ? CONFIG.shake.kill : CONFIG.shake.hit);
    this.audio.explosion(big);
    if (e.type === 'boss') {
      this.shake = CONFIG.shake.bossKill;
      burstParticles(this.particles, e.x, e.y, '#ffffff', 60, 380, this.rng);
      this.texts.push(createFloatText(e.x, e.y - 70, 'FLAGSHIP DOWN  +2000', '#ffd166'));
    }
    if (e.type === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const d = { ...e, type: 'drone', hp: 1, maxHp: 1, radius: 12, score: 25, color: '#3ee6c4', splits: false };
        d.x = e.x + (i === 0 ? -14 : 14);
        d.y = e.y;
        d.t = this.rng() * Math.PI * 2;
        this.enemies.push(d);
      }
    }
    // Overdrive charge.
    if (this.player.overdrive > 0 && this.player.overdriveActive <= 0) {
      this.player.overdrive = Math.min(1, this.player.overdrive + 0.08);
    }
    // Pickup drop.
    if (this.rng() < CONFIG.pickups.dropChance) {
      this.pickups.push(createPickup(e.x, e.y, pickPickupKind(this.rng), this.rng));
    }
  }

  _hurtPlayer() {
    const p = this.player;
    p.hull -= 1;
    p.invuln = CONFIG.player.invulnerableTime;
    this.shake = CONFIG.shake.playerHit;
    this.combo = 1;
    this.comboTimer = 0;
    this.audio.playerHit();
    burstParticles(this.particles, p.x, p.y, '#ff5d8f', 24, 260, this.rng);
    if (p.hull <= 0) {
      p.alive = false;
      this._gameOver();
    }
  }

  _collectPickup(pk) {
    const p = this.player;
    this.audio.pickup();
    switch (pk.kind) {
      case 'repair':
        if (p.hull < p.maxHull) {
          p.hull += 1;
          this.texts.push(createFloatText(p.x, p.y - 24, '+1 HULL', '#5dff8f'));
        } else {
          this.score += 250;
          this.texts.push(createFloatText(p.x, p.y - 24, '+250', '#ffd166'));
        }
        break;
      case 'shield':
        p.invuln = Math.max(p.invuln, 4);
        this.texts.push(createFloatText(p.x, p.y - 24, 'SHIELD 4s', '#7df9ff'));
        break;
      case 'overdrive':
        if (p.overdrive > 0) {
          p.overdrive = Math.min(1, p.overdrive + 0.5);
          this.texts.push(createFloatText(p.x, p.y - 24, 'OVERDRIVE +50%', '#ffb020'));
        } else {
          this.score += 500;
          this.texts.push(createFloatText(p.x, p.y - 24, '+500', '#ffd166'));
        }
        break;
      case 'score':
        this.score += 500;
        this.texts.push(createFloatText(p.x, p.y - 24, '+500', '#ffd166'));
        break;
      default:
        break;
    }
    burstParticles(this.particles, pk.x, pk.y, '#ffd166', 8, 140, this.rng);
  }

  _updateFx(dt) {
    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.exp(-2.2 * dt);
      pt.vy *= Math.exp(-2.2 * dt);
      pt.life -= dt;
      if (pt.life <= 0) pt.dead = true;
    }
    this.particles = this.particles.filter((pt) => !pt.dead);
    for (const t of this.texts) {
      t.y -= 34 * dt;
      t.life -= dt;
      if (t.life <= 0) t.dead = true;
    }
    this.texts = this.texts.filter((t) => !t.dead);
  }

  // ---------------------------------------------------------- render

  render() {
    const ctx = this.ctx;
    const t = this.frozen ? this.frozenTime : this.time;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);
    Render.drawBackground(ctx, this.stars, t, this.scrollY);
    // Pickups under everything else.
    for (const pk of this.pickups) Render.drawPickup(ctx, pk, t);
    for (const e of this.enemies) Render.drawEnemy(ctx, e);
    for (const m of this.missiles) Render.drawMissile(ctx, m);
    for (const b of this.bullets) Render.drawBullet(ctx, b);
    for (const b of this.enemyBullets) Render.drawBullet(ctx, b);
    for (const pt of this.particles) Render.drawParticle(ctx, pt);
    if (this.player.alive && this.state !== 'title') Render.drawPlayer(ctx, this.player, t);
    for (const ft of this.texts) Render.drawFloatText(ctx, ft);
    ctx.restore();

    if (this.state === 'playing' || this.state === 'upgrade-pending' || this.state === 'paused') {
      Render.drawHUD(ctx, this);
      Render.drawWaveBanner(ctx, this.banner, this.bannerAlpha);
    }
    if (this.state === 'title') Render.drawTitleScreen(ctx, this, t);
    if (this.state === 'upgrade') Render.drawUpgradeScreen(ctx, this);
    if (this.state === 'gameover') Render.drawGameOverScreen(ctx, this);
    if (this.state === 'paused') Render.drawPausedScreen(ctx);
    if (this.audio.muted) {
      ctx.save();
      ctx.fillStyle = 'rgba(143,168,200,0.8)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MUTED (M)', 18, CONFIG.H - 44);
      ctx.restore();
    }
  }
}
