const arena = document.getElementById('arena');
const dialEl = document.getElementById('dial');
const markerEl = document.getElementById('dial-marker');
const volumeDisplay = document.getElementById('volume-display');
const submitBtn = document.getElementById('submit-btn');
const timerDisplay = document.getElementById('timer-display');

let timerStart = Date.now();
let hasAdjusted = false;
let timerInterval = setInterval(function() {
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  timerDisplay.textContent = elapsed + 's';
}, 1000);

let ARENA_W = window.innerWidth;
let ARENA_H = window.innerHeight;
const RADIUS = 30;
const PAD = RADIUS + 2;
const PANIC_D = 180;
const CAUTION_D = 350;
const WATCH_D = 550;
const PANIC_F = 1.4;
const CAUTION_F = 0.28;
const RETURN_F = 0.003;
const FRICTION = 0.82;
const MAX_SPEED = 18;
const SAMPLES = 12;

let speedSamples = [];
for (let i = 0; i < SAMPLES; i++) { speedSamples.push(0); }
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
let caught = false;
let dragging = false;

function dist(x1, y1, x2, y2) {
  const ax = x2 - x1, ay = y2 - y1;
  return Math.sqrt(ax * ax + ay * ay);
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function updateCursorSpeed() {
  speedSamples[speedIndex] = dist(prevMx, prevMy, mx, my);
  speedIndex = (speedIndex + 1) % SAMPLES;
  let total = 0;
  for (let s = 0; s < SAMPLES; s++) { total += speedSamples[s]; }
  cursorSpeed = total / SAMPLES;
}

function updateDial() {
  if (caught) {
    dvx = 0;
    dvy = 0;
    return;
  }

  const d = dist(mx, my, dx, dy);

  if (d < PANIC_D) {
    const angle = angleTo(mx, my, dx, dy);
    const speedMult = 1 + cursorSpeed * 0.18;
    dvx += Math.cos(angle) * PANIC_F * speedMult;
    dvy += Math.sin(angle) * PANIC_F * speedMult;
  } else if (d < CAUTION_D) {
    const angle = angleTo(mx, my, dx, dy);
    dvx += Math.cos(angle) * CAUTION_F;
    dvy += Math.sin(angle) * CAUTION_F;
  } else if (d < WATCH_D) {
    const angle = angleTo(mx, my, dx, dy);
    dvx += Math.cos(angle) * 0.03;
    dvy += Math.sin(angle) * 0.03;
  } else {
    dvx += (ARENA_W / 2 - dx) * RETURN_F;
    dvy += (ARENA_H / 2 - dy) * RETURN_F;
  }

  dvx *= FRICTION;
  dvy *= FRICTION;
  const speed = Math.sqrt(dvx * dvx + dvy * dvy);
  if (speed > MAX_SPEED) {
    dvx = (dvx / speed) * MAX_SPEED;
    dvy = (dvy / speed) * MAX_SPEED;
  }

  dx += dvx;
  dy += dvy;

  if (dx < PAD)           { dx = PAD;           dvx =  Math.abs(dvx) * 0.4; }
  if (dx > ARENA_W - PAD) { dx = ARENA_W - PAD; dvx = -Math.abs(dvx) * 0.4; }
  if (dy < PAD)           { dy = PAD;            dvy =  Math.abs(dvy) * 0.4; }
  if (dy > ARENA_H - PAD) { dy = ARENA_H - PAD; dvy = -Math.abs(dvy) * 0.4; }
}

function render() {
  dialEl.style.left = dx + 'px';
  dialEl.style.top = dy + 'px';
  volumeDisplay.textContent = Math.round(volume) + '%';
  const rotation = (volume / 100) * 270 - 135;
  markerEl.style.transform = 'translateX(-50%) rotate(' + rotation + 'deg)';
}

// catch the dial on click
document.addEventListener('mousedown', function() {
  if (dist(mx, my, dx, dy) < RADIUS) {
    caught = true;
    dragging = true;
  }
});

document.addEventListener('mouseup', function() {
  dragging = false;
});

// rotate marker while caught
document.addEventListener('mousemove', function(e) {
  prevMx = mx;
  prevMy = my;
  mx = e.clientX;
  my = e.clientY;
  updateCursorSpeed();

  if (caught && dragging) {
    let angleDeg = Math.atan2(my - dy, mx - dx) * 180 / Math.PI + 90;
    if (angleDeg > 180) angleDeg -= 360;
    const clamped = Math.max(-135, Math.min(135, angleDeg));
    volume = (clamped + 135) / 270 * 100;

    if (!hasAdjusted) {
      hasAdjusted = true;
      timerStart = Date.now();
      timerDisplay.textContent = '0s';
    }
  }
});

document.addEventListener('mouseleave', function() {
  for (let s = 0; s < SAMPLES; s++) { speedSamples[s] = 99; }
});

window.addEventListener('resize', function() {
  ARENA_W = window.innerWidth;
  ARENA_H = window.innerHeight;
});

// lock in the volume and release the dial
submitBtn.addEventListener('click', function() {
  clearInterval(timerInterval);
  alert('Volume set to ' + Math.round(volume) + '%');
  caught = false;
  dragging = false;
  hasAdjusted = false;
  timerStart = Date.now();
  timerInterval = setInterval(function() {
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    timerDisplay.textContent = elapsed + 's';
  }, 1000);
});

function gameLoop() {
  updateDial();
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
