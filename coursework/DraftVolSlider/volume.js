const volDisplay = document.getElementById('volume-display');
const submitBtn = document.getElementById('submit-btn');
const timerEl = document.getElementById('timer-display');

let timerStart = Date.now();
let started = false;

let timerInterval = setInterval(function() {
  let secs = Math.floor((Date.now() - timerStart) / 1000);
  timerEl.textContent = secs + 's';
}, 1000);

let arenaW = window.innerWidth;
let arenaH = window.innerHeight;

const radius = 32;
const pad = radius + 2;

//distance zones for dial
const panicDist = 130;
const cautionDist = 260;
const watchDist = 420;

const panicForce = 1.8;
const cautionForce = 0.28;
const returnForce = 0.008;
const friction = 0.82;
const maxSpd = 26;

const numSamples = 12;
let samples = new Array(numSamples).fill(0);
let sIdx = 0;
let cursorSpd = 0;

let mx = arenaW / 2;
let my = arenaH / 2;
let lastX = mx;
let lastY = my;

let volume = 50;
let held = null; //which dial is grabbed

const dials = [
  { id: 'up',   el: document.getElementById('dial-up'),   x: arenaW * 0.35, y: arenaH / 2, vx: 0, vy: 0 },
  { id: 'down', el: document.getElementById('dial-down'), x: arenaW * 0.65, y: arenaH / 2, vx: 0, vy: 0 }
];

function dist(x1, y1, x2, y2) {
  let dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx*dx + dy*dy);
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function trackSpeed() {
  samples[sIdx] = dist(lastX, lastY, mx, my);
  sIdx = (sIdx + 1) % numSamples;
  let total = 0;
  for (let i = 0; i < numSamples; i++) total += samples[i];
  cursorSpd = total / numSamples;
}
function updateDial(dial) {
  if (dial.id === held) {
    dial.x = mx;
    dial.y = my;
    dial.vx = 0;
    dial.vy = 0;
    return;
  }
  const d = dist(mx, my, dial.x, dial.y);
  const angle = angleTo(mx, my, dial.x, dial.y);

  if (d < panicDist) {
    let spdMult = 1 + cursorSpd * 0.18;
    dial.vx += Math.cos(angle) * panicForce * spdMult;
    dial.vy += Math.sin(angle) * panicForce * spdMult;
  } else if (d < cautionDist) {
    dial.vx += Math.cos(angle) * cautionForce;
    dial.vy += Math.sin(angle) * cautionForce;
  } else if (d < watchDist) {
    dial.vx += Math.cos(angle) * 0.03;
    dial.vy += Math.sin(angle) * 0.03;
  } else {
    //drift back toward center if nothing is nearby
    dial.vx += (arenaW / 2 - dial.x) * returnForce;
    dial.vy += (arenaH / 2 - dial.y) * returnForce;
  }
  dial.vx *= friction;
  dial.vy *= friction;

  let spd = Math.sqrt(dial.vx * dial.vx + dial.vy * dial.vy);
  if (spd > maxSpd) {
    dial.vx = (dial.vx / spd) * maxSpd;
    dial.vy = (dial.vy / spd) * maxSpd;
  }

  dial.x += dial.vx;
  dial.y += dial.vy;
  if (dial.x < pad)           { dial.x = pad;            dial.vx =  Math.abs(dial.vx) * 0.85; }
  if (dial.x > arenaW - pad)  { dial.x = arenaW - pad;   dial.vx = -Math.abs(dial.vx) * 0.85; }
  if (dial.y < pad)           { dial.y = pad;             dial.vy =  Math.abs(dial.vy) * 0.85; }
  if (dial.y > arenaH - pad)  { dial.y = arenaH - pad;   dial.vy = -Math.abs(dial.vy) * 0.85; }
}

function pushDialsApart() {
  const minDist = 90;
  const repelStr = 2.5;
  const d = dist(dials[0].x, dials[0].y, dials[1].x, dials[1].y);
  if (d < minDist && d > 0) {
    const angle = angleTo(dials[1].x, dials[1].y, dials[0].x, dials[0].y);
    const force = repelStr * (1 - d / minDist);
    if (dials[0].id !== held) {
      dials[0].vx += Math.cos(angle) * force;
      dials[0].vy += Math.sin(angle) * force;
    }
    if (dials[1].id !== held) {
      dials[1].vx -= Math.cos(angle) * force;
      dials[1].vy -= Math.sin(angle) * force;
    }
  }


}

function render() {
  for (const dial of dials) {
    dial.el.style.left = dial.x + 'px';
    dial.el.style.top  = dial.y + 'px';
  }
  volDisplay.textContent = Math.round(volume) + '%';
}
document.addEventListener('mousedown', function() {
  for (const dial of dials) {
    if (dist(mx, my, dial.x, dial.y) < radius) {
      held = dial.id;
      if (!started) {
        started = true;
        timerStart = Date.now();
        timerEl.textContent = '0s';
      }
      break;
    }
  }
}
);

document.addEventListener('mouseup', function() {
  held = null;
});

document.addEventListener('mousemove', function(e) {
  lastX = mx;
  lastY = my;
  mx = e.clientX;
  my = e.clientY;
  trackSpeed();
});

document.addEventListener('mouseleave', function() {
  samples.fill(99);
});

window.addEventListener('resize', function() {
  arenaW = window.innerWidth;
  arenaH = window.innerHeight;
});

submitBtn.addEventListener('click', function() {
  clearInterval(timerInterval);
  let elapsed = Math.floor((Date.now() - timerStart) / 1000);
  alert('Volume set to ' + Math.round(volume) + '%\nTime taken: ' + elapsed + 's');
  held = null;
  started = false;
  timerStart = Date.now();
  timerInterval = setInterval(function() {
    let secs = Math.floor((Date.now() - timerStart) / 1000);
    timerEl.textContent = secs + 's';
  }, 1000);

});

function loop() {
  for (const dial of dials) {
    updateDial(dial);
  }
  pushDialsApart();
  if (held === 'up')   volume = Math.min(100, volume + 1.4);
  if (held === 'down') volume = Math.max(0,   volume - 1.4);
  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
