const arena = document.getElementById('arena');
const dialEl = document.getElementById('dial');
const markerEl = document.getElementById('dial-marker');
const volumeDisplay = document.getElementById('volume-display');

let ARENA_W = window.innerWidth;
let ARENA_H = window.innerHeight;

const DIAL_RADIUS = 30;
const WALL_PAD = DIAL_RADIUS + 2;

const PANIC_DIST = 100;
const CAUTION_DIST = 220;
const WATCH_DIST = 380;

const PANIC_FORCE = 1.1;
const CAUTION_FORCE = 0.18;
const RETURN_FORCE = 0.003;
const FRICTION = 0.82;
const MAX_SPEED = 18;

const SPEED_SAMPLES = 12;
let speedSamples = [];
for (let i = 0; i < SPEED_SAMPLES; i++) { speedSamples.push(0); }
let speedIndex = 0;
let cursorSpeed = 0;

let dx = ARENA_W / 2;
let dy = ARENA_H / 2;
let dvx = 0;
let dvy = 0;

let mx = ARENA_W / 2;
let my = ARENA_H / 2;
let prevMx = mx;
let prevMy = my;

let volume = 50;

function dist(x1, y1, x2, y2) {
  let ax = x2 - x1, ay = y2 - y1;
  return Math.sqrt(ax * ax + ay * ay);
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// rolling average of cursor speed
function updateCursorSpeed() {
  speedSamples[speedIndex] = dist(prevMx, prevMy, mx, my);
  speedIndex = (speedIndex + 1) % SPEED_SAMPLES;
  let total = 0;
  for (let s = 0; s < SPEED_SAMPLES; s++) { total += speedSamples[s]; }
  cursorSpeed = total / SPEED_SAMPLES;
}

// dial movement and wall bouncing
function updateDial() {
  let d = dist(mx, my, dx, dy);

  if (d < PANIC_DIST) {
    let angle = angleTo(mx, my, dx, dy);
    let speedMult = 1 + cursorSpeed * 0.18;
    dvx += Math.cos(angle) * PANIC_FORCE * speedMult;
    dvy += Math.sin(angle) * PANIC_FORCE * speedMult;

  } else if (d < CAUTION_DIST) {
    let angle = angleTo(mx, my, dx, dy);
    dvx += Math.cos(angle) * CAUTION_FORCE;
    dvy += Math.sin(angle) * CAUTION_FORCE;

  } else if (d < WATCH_DIST) {
    let angle = angleTo(mx, my, dx, dy);
    dvx += Math.cos(angle) * 0.03;
    dvy += Math.sin(angle) * 0.03;

  } else {
    dvx += (ARENA_W / 2 - dx) * RETURN_FORCE;
    dvy += (ARENA_H / 2 - dy) * RETURN_FORCE;
  }

  dvx *= FRICTION;
  dvy *= FRICTION;
  let speed = Math.sqrt(dvx * dvx + dvy * dvy);
  if (speed > MAX_SPEED) {
    dvx = (dvx / speed) * MAX_SPEED;
    dvy = (dvy / speed) * MAX_SPEED;
  }

  dx += dvx;
  dy += dvy;

  if (dx < WALL_PAD)           { dx = WALL_PAD;           dvx =  Math.abs(dvx) * 0.4; }
  if (dx > ARENA_W - WALL_PAD) { dx = ARENA_W - WALL_PAD; dvx = -Math.abs(dvx) * 0.4; }
  if (dy < WALL_PAD)           { dy = WALL_PAD;            dvy =  Math.abs(dvy) * 0.4; }
  if (dy > ARENA_H - WALL_PAD) { dy = ARENA_H - WALL_PAD; dvy = -Math.abs(dvy) * 0.4; }
}

// update dial position and volume label
function render() {
  dialEl.style.left = dx + 'px';
  dialEl.style.top = dy + 'px';
  volumeDisplay.textContent = Math.round(volume) + '%';
  let rotation = (volume / 100) * 270 - 135;
  markerEl.style.transform = 'translateX(-50%) rotate(' + rotation + 'deg)';
}

// mouse tracking
arena.addEventListener('mousemove', function(e) {
  prevMx = mx;
  prevMy = my;
  mx = e.clientX;
  my = e.clientY;
  updateCursorSpeed();
});

arena.addEventListener('mouseleave', function() {
  for (let s = 0; s < SPEED_SAMPLES; s++) { speedSamples[s] = 99; }
});

window.addEventListener('resize', function() {
  ARENA_W = window.innerWidth;
  ARENA_H = window.innerHeight;
});

function gameLoop() {
  updateDial();
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
