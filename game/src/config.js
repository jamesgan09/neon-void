// NEON VOID — tuning constants. One place for every number that shapes
// how the game feels, so balancing is a config edit, never a code hunt.
export const CONFIG = {
  // Logical playfield. The canvas scales to the window with letterboxing.
  W: 1280,
  H: 720,

  player: {
    radius: 14,
    speed: 340,
    accel: 2600,
    drag: 6.5,
    fireInterval: 0.16,
    bulletSpeed: 720,
    bulletDamage: 1,
    maxHull: 3,
    dashCooldown: 2.2,
    dashSpeed: 980,
    dashTime: 0.14,
    invulnerableTime: 1.6,
    magnetRadius: 90,
  },

  // Combo: kills within this window keep the multiplier alive.
  comboWindow: 2.5,
  comboStep: 0.25,
  comboMax: 8,

  // Waves: base count grows, composition shifts toward heavies.
  wave: {
    baseCount: 6,
    perWave: 2,
    spawnInterval: 0.85,
    intermission: 2.2,
    bossEvery: 5,
  },

  enemies: {
    drone:   { hp: 1, speed: 130, radius: 13, score: 50,  color: '#ff5d8f' },
    weaver:  { hp: 2, speed: 110, radius: 15, score: 100, color: '#ffb020' },
    tank:    { hp: 8, speed: 55,  radius: 24, score: 200, color: '#b06bff' },
    splitter:{ hp: 3, speed: 95,  radius: 17, score: 150, color: '#3ee6c4' },
    boss:    { hp: 90, speed: 42, radius: 58, score: 2000, color: '#ff3b30' },
  },

  pickups: {
    dropChance: 0.14,
    shield: 0.35,
    repair: 0.3,
    overdrive: 0.2,
    score: 0.15,
    lifeTime: 9,
  },

  // Starfield depth layers (parallax factors and counts).
  stars: [
    { count: 70, factor: 0.15, size: 1 },
    { count: 50, factor: 0.35, size: 1.6 },
    { count: 26, factor: 0.6, size: 2.4 },
  ],

  // Juice.
  shake: { hit: 4, kill: 7, playerHit: 12, bossKill: 18 },
  particles: { kill: 18, hit: 5, thrust: 2, explosion: 60 },
};

// Upgrade cards offered between waves. Each has an id, a name, a short
// description and an apply() that mutates the player's loadout.
export const UPGRADES = [
  { id: 'damage', name: 'HEAVY ROUNDS', desc: '+1 bullet damage', icon: 'DMG' },
  { id: 'firerate', name: 'OVERCLOCK', desc: '+22% fire rate', icon: 'RPM' },
  { id: 'spread', name: 'TRIPLE SHOT', desc: '+1 projectile per shot', icon: 'x3' },
  { id: 'missiles', name: 'SEEKER RACK', desc: 'Homing missiles join every volley', icon: 'MSL' },
  { id: 'pierce', name: 'LANCE ROUNDS', desc: 'Bullets pierce +1 enemy', icon: 'PRC' },
  { id: 'shield', name: 'AEGIS PLATING', desc: '+1 max hull, repair 1', icon: 'HP' },
  { id: 'speed', name: 'ION THRUSTERS', desc: '+14% move speed, faster dash', icon: 'SPD' },
  { id: 'magnet', name: 'TRACTOR WEB', desc: 'Pickups fly to you from farther', icon: 'MAG' },
  { id: 'overdrive', name: 'OVERDRIVE CORE', desc: 'Kills charge a 6s double-damage surge', icon: 'OD' },
  { id: 'regen', name: 'NANO WEAVE', desc: 'Slowly repair hull over time', icon: 'RG' },
];

export const STORAGE_KEY = 'neon-void-highscore-v1';
