// Keyboard + mouse input. The canvas is scaled to the window, so mouse
// coordinates are translated back into the logical playfield.
import { CONFIG } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: CONFIG.W / 2, y: CONFIG.H / 2, down: false };
    this.pressed = new Set(); // edge-triggered keys, consumed each frame
    this.onKey = null; // optional hook: (code) => void, for menus
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) {
        this.keys.add(e.code);
        this.pressed.add(e.code);
        if (this.onKey) this.onKey(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    const toLogical = (clientX, clientY) => {
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((clientX - r.left) / r.width) * CONFIG.W,
        y: ((clientY - r.top) / r.height) * CONFIG.H,
      };
    };
    this.canvas.addEventListener('mousemove', (e) => {
      const p = toLogical(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });
    this.canvas.addEventListener('mousedown', (e) => {
      const p = toLogical(e.clientX, e.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.down = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once, on the frame the key went down. Cleared by endFrame().
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }

  // Movement vector from WASD or arrows, normalized.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get firing() {
    return this.mouse.down || this.down('Space');
  }
}
