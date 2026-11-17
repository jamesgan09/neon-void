// High-score persistence (localStorage, guarded for sandboxed contexts).
import { STORAGE_KEY } from './config.js';

export function loadBest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw === null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Storage unavailable (private mode, sandbox): the score just lives
    // for this session. Never let persistence break the game.
  }
}
