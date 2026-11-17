// Boot: create the game, apply a screenshot state when the URL asks for
// one, and run the frame loop.
import { Game } from './main.js';
import { applyShotMode } from './shots.js';

const canvas = document.getElementById('game');
const params = new URLSearchParams(window.location.search);
const seedParam = parseInt(params.get('seed') || '1', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 1;

const game = new Game(canvas, { seed });
window.__game = game; // handy for the finalist review and for debugging

const shot = params.get('shot');
if (shot) applyShotMode(game, shot, seed);

function loop(now) {
  game.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
