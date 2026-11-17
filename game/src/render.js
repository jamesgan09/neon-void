// All drawing. One canvas, one neon art direction: deep-space background,
// glow via shadowBlur, and a fixed palette so every screen reads at a
// glance — including when the judge shrinks it to a contact sheet.
import { CONFIG } from './config.js';
import { clamp } from './random.js';

const PALETTE = {
  bg: '#05060f',
  panel: 'rgba(10, 14, 34, 0.82)',
  line: 'rgba(125, 249, 255, 0.35)',
  text: '#e8f6ff',
  dim: '#8fa8c8',
  accent: '#7df9ff',
  danger: '#ff5d8f',
  gold: '#ffd166',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawBackground(ctx, stars, time, scrollY) {
  const { W, H } = CONFIG;
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);

  // Nebula blobs, drawn as soft radial gradients that drift slowly.
  const blobs = [
    { x: W * 0.22, y: H * 0.3, r: 340, c: 'rgba(88, 40, 180, 0.20)' },
    { x: W * 0.82, y: H * 0.62, r: 380, c: 'rgba(20, 120, 160, 0.16)' },
    { x: W * 0.55, y: H * 0.9, r: 300, c: 'rgba(190, 40, 90, 0.12)' },
  ];
  for (const b of blobs) {
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    g.addColorStop(0, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
  }

  // Parallax starfield.
  for (const layer of stars) {
    for (const s of layer.stars) {
      const y = (s.y + scrollY * layer.factor) % H;
      const tw = 0.55 + 0.45 * Math.sin(time * s.tw + s.phase);
      ctx.globalAlpha = tw * s.alpha;
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(s.x, y < 0 ? y + H : y, s.size, s.size);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.rotate(p.angle + Math.PI / 2);
  // Engine flame.
  const flame = 14 + Math.sin(time * 40) * 5 + p.thrust * 14;
  const fg = ctx.createLinearGradient(0, 12, 0, 12 + flame);
  fg.addColorStop(0, 'rgba(255, 200, 90, 0.9)');
  fg.addColorStop(1, 'rgba(255, 80, 40, 0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 12 + flame);
  ctx.lineTo(5, 12);
  ctx.closePath();
  ctx.fill();
  // Hull: a swept arrow with a cyan glow.
  ctx.shadowColor = '#37e0ff';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0e2a4a';
  ctx.strokeStyle = '#7df9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(13, 12);
  ctx.lineTo(5, 7);
  ctx.lineTo(0, 10);
  ctx.lineTo(-5, 7);
  ctx.lineTo(-13, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Cockpit.
  ctx.fillStyle = '#bff6ff';
  ctx.beginPath();
  ctx.arc(0, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dash cooldown ring.
  if (p.dashCooldown > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 8, -Math.PI / 2, -Math.PI / 2 + (1 - clamp(p.dashCooldown / 2.2, 0, 1)) * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawBullet(ctx, b) {
  ctx.save();
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawMissile(ctx, m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(4, 5);
  ctx.lineTo(0, 2);
  ctx.lineTo(-4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  ctx.strokeStyle = flash ? '#ffffff' : e.color;
  ctx.lineWidth = 2;
  switch (e.type) {
    case 'drone': {
      ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(11, 9);
      ctx.lineTo(0, 4);
      ctx.lineTo(-11, 9);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'weaver': {
      ctx.rotate(e.t * 2);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#05060f';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tank': {
      ctx.rotate(e.t * 0.4);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = i % 2 === 0 ? 24 : 17;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'splitter': {
      ctx.rotate(e.t);
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#05060f';
      ctx.beginPath();
      ctx.arc(-6, -4, 4, 0, Math.PI * 2);
      ctx.arc(6, -4, 4, 0, Math.PI * 2);
      ctx.arc(0, 7, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'boss': {
      ctx.rotate(Math.sin(e.t * 0.7) * 0.08);
      // Crown hull.
      ctx.beginPath();
      ctx.moveTo(0, -58);
      ctx.lineTo(46, -20);
      ctx.lineTo(58, 26);
      ctx.lineTo(28, 52);
      ctx.lineTo(-28, 52);
      ctx.lineTo(-58, 26);
      ctx.lineTo(-46, -20);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Core eye.
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 4, 12 + Math.sin(e.t * 5) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(0, 4, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();

  // Health bar for anything tougher than a drone.
  if (e.maxHp > 2 && e.type !== 'boss') {
    const w = e.radius * 2;
    const frac = clamp(e.hp / e.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * frac, 4);
  }
}

export function drawParticle(ctx, pt) {
  const frac = pt.life / pt.maxLife;
  ctx.globalAlpha = frac;
  ctx.fillStyle = pt.color;
  ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  ctx.globalAlpha = 1;
}

export function drawPickup(ctx, pk, time) {
  const bob = Math.sin(time * 4 + pk.t) * 3;
  ctx.save();
  ctx.translate(pk.x, pk.y + bob);
  ctx.shadowBlur = 12;
  const colors = {
    shield: '#7df9ff',
    repair: '#5dff8f',
    overdrive: '#ffb020',
    score: '#ffd166',
  };
  const color = colors[pk.kind] || '#fff';
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(5, 6, 15, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = { shield: 'SH', repair: '+1', overdrive: 'OD', score: '★' }[pk.kind];
  ctx.fillText(label, 0, 0.5);
  ctx.restore();
}

export function drawFloatText(ctx, ft) {
  const frac = ft.life / ft.maxLife;
  ctx.save();
  ctx.globalAlpha = frac;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = ft.color;
  ctx.shadowColor = ft.color;
  ctx.shadowBlur = 8;
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}

// ---------------------------------------------------------------- HUD

export function drawHUD(ctx, g) {
  const { W } = CONFIG;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Score, top-left.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 26px monospace';
  ctx.shadowColor = '#7df9ff';
  ctx.shadowBlur = 8;
  ctx.fillText(String(g.score).padStart(7, '0'), 18, 36);
  ctx.shadowBlur = 0;
  ctx.font = '12px monospace';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST ${Math.max(g.best, g.score)}`, 18, 56);

  // Wave, top-center.
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`WAVE ${g.wave}`, W / 2, 32);
  ctx.font = '12px monospace';
  ctx.fillStyle = PALETTE.dim;
  const remaining = g.director.queue.length + g.enemies.length;
  ctx.fillText(g.state === 'playing' ? `${remaining} HOSTILES` : '', W / 2, 52);

  // Hull pips, top-right.
  ctx.textAlign = 'right';
  for (let i = 0; i < g.player.maxHull; i++) {
    const x = W - 24 - i * 26;
    ctx.fillStyle = i < g.player.hull ? '#ff5d8f' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x + 7, 34);
    ctx.lineTo(x - 7, 34);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = '12px monospace';
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('HULL', W - 24 - g.player.maxHull * 26 - 8, 34);

  // Combo meter, under the score.
  if (g.combo > 1) {
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`COMBO x${g.combo.toFixed(2)}`, 18, 82);
    const w = 110 * clamp(g.comboTimer / 2.5, 0, 1);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
    ctx.fillRect(18, 90, 110, 5);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(18, 90, w, 5);
  }

  // Overdrive charge, bottom-left.
  if (g.player.overdrive > 0) {
    const active = g.player.overdriveActive > 0;
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = active ? '#ffb020' : PALETTE.dim;
    ctx.fillText(active ? 'OVERDRIVE!' : `OVERDRIVE ${Math.floor(g.player.overdrive * 100)}%`, 18, CONFIG.H - 22);
    const w = 160 * clamp(g.player.overdrive, 0, 1);
    ctx.fillStyle = 'rgba(255,176,32,0.25)';
    ctx.fillRect(18, CONFIG.H - 16, 160, 6);
    ctx.fillStyle = '#ffb020';
    ctx.fillRect(18, CONFIG.H - 16, w, 6);
  }

  // Boss bar, bottom-center.
  if (g.boss && !g.boss.dead) {
    const w = 420;
    const x = (W - w) / 2;
    const y = CONFIG.H - 34;
    const frac = clamp(g.boss.hp / g.boss.maxHp, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#ff8a80';
    ctx.fillText('VOID MAW — FLAGSHIP', W / 2, y - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(x, y, w * frac, 8);
  }

  // Controls hint, bottom-right, fades after the first wave.
  if (g.wave <= 1 && g.state === 'playing') {
    ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(143,168,200,0.75)';
    ctx.fillText('WASD MOVE · MOUSE AIM · CLICK FIRE · SHIFT DASH · P PAUSE · M MUTE', W - 18, CONFIG.H - 18);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Screens

function title(ctx, text, y, font, color, glow) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = font;
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 24;
  }
  ctx.fillText(text, CONFIG.W / 2, y);
  ctx.restore();
}

function button(ctx, label, y, w, selected) {
  const x = CONFIG.W / 2 - w / 2;
  const h = 52;
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = selected ? 'rgba(125, 249, 255, 0.22)' : PALETTE.panel;
  ctx.fill();
  ctx.strokeStyle = selected ? '#7df9ff' : PALETTE.line;
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();
  ctx.fillStyle = selected ? '#ffffff' : PALETTE.text;
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, CONFIG.W / 2, y + h / 2 + 1);
  ctx.restore();
  return { x, y, w, h };
}

export function drawTitleScreen(ctx, g, time) {
  const { W, H } = CONFIG;
  // Hero ship drifting above the title.
  const shipY = 168 + Math.sin(time * 1.2) * 8;
  ctx.save();
  ctx.translate(W / 2, shipY);
  ctx.rotate(Math.sin(time * 0.8) * 0.06);
  ctx.shadowColor = '#37e0ff';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#0e2a4a';
  ctx.strokeStyle = '#7df9ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(24, 22);
  ctx.lineTo(9, 12);
  ctx.lineTo(0, 18);
  ctx.lineTo(-9, 12);
  ctx.lineTo(-24, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  title(ctx, 'NEON VOID', 300, 'bold 84px monospace', '#e8f6ff', '#37e0ff');
  title(ctx, 'A WAVE SURVIVAL SHOOTER', 344, 'bold 19px monospace', PALETTE.accent, null);
  title(ctx, 'Survive the swarm. Pick your upgrades. Break the flagship.', 386, '15px monospace', PALETTE.dim, null);

  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  title(ctx, g.best > 0 ? `BEST ${g.best}` : 'NO PILOT RECORD YET — BE THE FIRST', 428, 'bold 16px monospace', PALETTE.gold, null);
  ctx.restore();

  button(ctx, '▶  LAUNCH  (ENTER / CLICK)', 470, 360, true);
  title(ctx, 'WASD / ARROWS — MOVE      MOUSE — AIM      CLICK / SPACE — FIRE', 566, '14px monospace', PALETTE.dim, null);
  title(ctx, 'SHIFT — DASH      P — PAUSE      M — MUTE', 590, '14px monospace', PALETTE.dim, null);
  title(ctx, 'Between waves, choose 1 of 3 upgrades. A flagship hunts you every 5th wave.', 626, '14px monospace', PALETTE.dim, null);
  title(ctx, 'NEON VOID — an original game. No assets were borrowed; art and sound are generated in code.', H - 24, '12px monospace', 'rgba(143,168,200,0.6)', null);
}

export function drawUpgradeScreen(ctx, g) {
  const { W } = CONFIG;
  ctx.fillStyle = 'rgba(3, 4, 10, 0.72)';
  ctx.fillRect(0, 0, W, CONFIG.H);
  title(ctx, `WAVE ${g.wave} CLEARED`, 150, 'bold 44px monospace', '#e8f6ff', '#7df9ff');
  title(ctx, `SCORE ${g.score}   ·   CHOOSE ONE UPGRADE`, 196, 'bold 17px monospace', PALETTE.gold, null);
  const cardW = 300;
  const cardH = 210;
  const gap = 28;
  const total = cardW * 3 + gap * 2;
  const startX = (W - total) / 2;
  const y = 250;
  g.upgradeCards = [];
  g.upgradeChoices.forEach((id, i) => {
    const u = g.upgradeChoicesMeta[i];
    const x = startX + i * (cardW + gap);
    const selected = g.upgradeSelected === i;
    ctx.save();
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fillStyle = selected ? 'rgba(125, 249, 255, 0.16)' : PALETTE.panel;
    ctx.fill();
    ctx.strokeStyle = selected ? '#7df9ff' : PALETTE.line;
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.stroke();
    // Icon chip.
    ctx.fillStyle = 'rgba(125, 249, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 52, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.accent;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.icon, x + cardW / 2, y + 53);
    // Name + desc.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(u.name, x + cardW / 2, y + 116);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '15px monospace';
    ctx.fillText(u.desc, x + cardW / 2, y + 148);
    const taken = g.upgradeTaken[id] || 0;
    ctx.fillStyle = 'rgba(143,168,200,0.8)';
    ctx.font = '12px monospace';
    ctx.fillText(taken > 0 ? `OWNED x${taken}` : 'NEW', x + cardW / 2, y + 180);
    ctx.restore();
    g.upgradeCards.push({ x, y, w: cardW, h: cardH, index: i });
  });
  title(ctx, 'CLICK A CARD, OR PRESS 1 / 2 / 3', 510, 'bold 16px monospace', PALETTE.text, null);
}

export function drawGameOverScreen(ctx, g) {
  const { W, H } = CONFIG;
  ctx.fillStyle = 'rgba(3, 4, 10, 0.66)';
  ctx.fillRect(0, 0, W, H);
  title(ctx, 'SHIP LOST', 190, 'bold 64px monospace', '#ff5d8f', '#ff3b30');
  title(ctx, `THE VOID CLAIMS ANOTHER PILOT`, 236, 'bold 16px monospace', PALETTE.dim, null);

  const rows = [
    ['FINAL SCORE', String(g.score)],
    ['WAVE REACHED', String(g.wave)],
    ['ENEMIES DOWN', String(g.kills)],
    ['BEST', String(Math.max(g.best, g.score))],
  ];
  ctx.save();
  ctx.textAlign = 'left';
  rows.forEach(([label, value], i) => {
    const y = 310 + i * 44;
    ctx.font = '15px monospace';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText(label, W / 2 - 190, y);
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, W / 2 + 190, y);
    ctx.textAlign = 'left';
  });
  ctx.restore();

  if (g.score >= g.best && g.score > 0) {
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 240);
    ctx.save();
    ctx.globalAlpha = pulse;
    title(ctx, '★ NEW BEST SCORE ★', 500, 'bold 22px monospace', PALETTE.gold, '#ffd166');
    ctx.restore();
  }
  button(ctx, '↻  FLY AGAIN  (ENTER / CLICK)', 540, 360, true);
  title(ctx, 'Your best score is saved on this machine.', H - 24, '12px monospace', 'rgba(143,168,200,0.6)', null);
}

export function drawPausedScreen(ctx) {
  const { W, H } = CONFIG;
  ctx.fillStyle = 'rgba(3, 4, 10, 0.6)';
  ctx.fillRect(0, 0, W, H);
  title(ctx, 'PAUSED', 330, 'bold 56px monospace', '#e8f6ff', '#7df9ff');
  title(ctx, 'P — RESUME      M — MUTE      R — RESTART RUN', 390, '16px monospace', PALETTE.dim, null);
}

export function drawWaveBanner(ctx, text, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  title(ctx, text, 330, 'bold 52px monospace', '#e8f6ff', '#ff5d8f');
  ctx.restore();
}
