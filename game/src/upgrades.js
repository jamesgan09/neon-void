// Upgrades: what each card does to the player's loadout, and the
// per-choice caps so no single stat can be stacked without limit.
import { UPGRADES } from './config.js';

export const UPGRADE_CAPS = {
  damage: 5,
  firerate: 5,
  spread: 3,
  missiles: 3,
  pierce: 3,
  shield: 3,
  speed: 3,
  magnet: 3,
  overdrive: 1,
  regen: 3,
};

export function upgradeById(id) {
  return UPGRADES.find((u) => u.id === id);
}

export function applyUpgrade(player, id) {
  switch (id) {
    case 'damage':
      player.damage += 1;
      break;
    case 'firerate':
      player.fireInterval *= 0.82;
      break;
    case 'spread':
      player.projectiles += 1;
      break;
    case 'missiles':
      player.missiles += 1;
      break;
    case 'pierce':
      player.pierce += 1;
      break;
    case 'shield':
      player.maxHull += 1;
      player.hull = Math.min(player.maxHull, player.hull + 1);
      break;
    case 'speed':
      player.speedMul *= 1.14;
      player.dashCooldown = Math.max(1.2, player.dashCooldown - 0.25);
      break;
    case 'magnet':
      player.magnetMul *= 1.6;
      break;
    case 'overdrive':
      player.overdrive = 0.0001; // owned, charge starts at ~0
      break;
    case 'regen':
      player.regen += 0.35;
      break;
    default:
      break;
  }
}
