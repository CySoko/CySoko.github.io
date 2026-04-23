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
const RADIUS = 32;
const PAD = RADIUS + 2;
const PANIC_D = 130;
const CAUTION_D = 260;
const WATCH_D = 420;
const PANIC_F = 1.8;
const CAUTION_F = 0.28;
const RETURN_F = 0.008;
const FRICTION = 0.82;
const MAX_SPEED = 26;
const SAMPLES = 12;
const VOL_RATE = 2.0; // % per frame while holding a dial

let mx = ARENA_W / 2;
let my = ARENA_H / 2;
let prevMx = mx;
let prevMy = my;

let speedSamples = new Array(SAMPLES).fill(0);
let speedIndex = 0;
let cursorSpeed = 0;

let volume = 50;
let caughtId = null; // 'up' or 'down' or null

const dials = [
  {
    id: 'up',
    el: document.getElementById('dial-up'),
    x: ARENA_W * 0.35,
    y: ARENA_H / 2,
    vx: 0,
    vy: 0
  },
  {
    id: 'down',
    el: document.getElementById('dial-down'),
    x: ARENA_W * 0.65,
    y: ARENA_H / 2,
    vx: 0,
    vy: 0
  }
];

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
  for (let i = 0; i < SAMPLES; i++) total += speedSamples[i];
  cursorSpeed = total / SAMPLES;
}

function updateDial(dial) {
  if (dial.id === caughtId) {
    dial.x = mx;
    dial.y = my;
    dial.vx = 0;
    dial.vy = 0;
    return;
  }

  const d = dist(mx, my, dial.x, dial.y);

  if (d < PANIC_D) {
    const angle = angleTo(mx, my, dial.x, dial.y);
    const speedMult = 1 + cursorSpeed * 0.18;
    dial.vx += Math.cos(angle) * PANIC_F * speedMult;
    dial.vy += Math.sin(angle) * PANIC_F * speedMult;
  } else if (d < CAUTION_D) {
    const angle = angleTo(mx, my, dial.x, dial.y);
    dial.vx += Math.cos(angle) * CAUTION_F;
    dial.vy += Math.sin(angle) * CAUTION_F;
  } else if (d < WATCH_D) {
    const angle = angleTo(mx, my, dial.x, dial.y);
    dial.vx += Math.cos(angle) * 0.03;
    dial.vy += Math.sin(angle) * 0.03;
  } else {
    dial.vx += (ARENA_W / 2 - dial.x) * RETURN_F;
    dial.vy += (ARENA_H / 2 - dial.y) * RETURN_F;
  }

  dial.vx *= FRICTION;
  dial.vy *= FRICTION;
  const speed = Math.sqrt(dial.vx * dial.vx + dial.vy * dial.vy);
  if (speed > MAX_SPEED) {
    dial.vx = (dial.vx / speed) * MAX_SPEED;
    dial.vy = (dial.vy / speed) * MAX_SPEED;
  }

  dial.x += dial.vx;
  dial.y += dial.vy;

  if (dial.x < PAD)           { dial.x = PAD;           dial.vx =  Math.abs(dial.vx) * 0.85; }
  if (dial.x > ARENA_W - PAD) { dial.x = ARENA_W - PAD; dial.vx = -Math.abs(dial.vx) * 0.85; }
  if (dial.y < PAD)           { dial.y = PAD;            dial.vy =  Math.abs(dial.vy) * 0.85; }
  if (dial.y > ARENA_H - PAD) { dial.y = ARENA_H - PAD; dial.vy = -Math.abs(dial.vy) * 0.85; }
}

function applyDialRepulsion() {
  const REPEL_D = 90;
  const REPEL_F = 2.5;
  const d = dist(dials[0].x, dials[0].y, dials[1].x, dials[1].y);
  if (d < REPEL_D && d > 0) {
    const angle = angleTo(dials[1].x, dials[1].y, dials[0].x, dials[0].y);
    const force = REPEL_F * (1 - d / REPEL_D);
    if (dials[0].id !== caughtId) {
      dials[0].vx += Math.cos(angle) * force;
      dials[0].vy += Math.sin(angle) * force;
    }
    if (dials[1].id !== caughtId) {
      dials[1].vx -= Math.cos(angle) * force;
      dials[1].vy -= Math.sin(angle) * force;
    }
  }
}

function render() {
  for (const dial of dials) {
    dial.el.style.left = dial.x + 'px';
    dial.el.style.top = dial.y + 'px';
  }
  volumeDisplay.textContent = Math.round(volume) + '%';
}

document.addEventListener('mousedown', function() {
  for (const dial of dials) {
    if (dist(mx, my, dial.x, dial.y) < RADIUS) {
      caughtId = dial.id;
      if (!hasAdjusted) {
        hasAdjusted = true;
        timerStart = Date.now();
        timerDisplay.textContent = '0s';
      }
      break;
    }
  }
});

document.addEventListener('mouseup', function() {
  caughtId = null;
});

document.addEventListener('mousemove', function(e) {
  prevMx = mx;
  prevMy = my;
  mx = e.clientX;
  my = e.clientY;
  updateCursorSpeed();
});

document.addEventListener('mouseleave', function() {
  speedSamples.fill(99);
});

window.addEventListener('resize', function() {
  ARENA_W = window.innerWidth;
  ARENA_H = window.innerHeight;
});

submitBtn.addEventListener('click', function() {
  clearInterval(timerInterval);
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  alert('Volume set to ' + Math.round(volume) + '%\nTime taken: ' + elapsed + 's');
  caughtId = null;
  hasAdjusted = false;
  timerStart = Date.now();
  timerInterval = setInterval(function() {
    const elapsed = Math.floor((Date.now() - timerStart) / 1000);
    timerDisplay.textContent = elapsed + 's';
  }, 1000);
});

function gameLoop() {
  for (const dial of dials) {
    updateDial(dial);
  }
  applyDialRepulsion();

  if (caughtId === 'up')   volume = Math.min(100, volume + VOL_RATE);
  if (caughtId === 'down') volume = Math.max(0,   volume - VOL_RATE);

  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
