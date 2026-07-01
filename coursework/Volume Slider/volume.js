// =============================================
// SECTION 1: ELEMENT REFERENCES
// =============================================
var arena         = document.getElementById('arena');
var dialEl        = document.getElementById('dial');
var markerEl      = document.getElementById('dial-marker');
var submitBtn      = document.getElementById('submit-btn');
var volumeDisplay  = document.getElementById('volume-display');

// =============================================
// SECTION 2: CONSTANTS
// =============================================
var DIAL_RADIUS = 30;          // half of 60px dial
var WALL_PAD    = DIAL_RADIUS + 2;  // min distance from wall to dial center

// Behavior zones (distance from cursor to dial)
var PANIC_DIST   = 100;  // dial runs fast
var CAUTION_DIST = 220;  // dial drifts away slowly
var WATCH_DIST   = 380;  // dial holds still

// Physics
var PANIC_FORCE   = 1.1;    // base panic acceleration (scales with cursor speed)
var CAUTION_FORCE = 0.18;
var RETURN_FORCE  = 0.003;  // pull toward center when relaxed (slow drift)
var FRICTION      = 0.82;   // velocity damping per frame
var MAX_SPEED     = 18;

// Calm / interaction thresholds
var CALM_CURSOR_SPEED  = 1.8;  // px/frame rolling avg to count as "slow"
var CALM_APPROACH_DIST = 90;   // cursor must be within this distance
var CORNER_THRESHOLD   = 55;   // distance from wall corner to count as "cornered"

// Number of frames to average cursor speed over
var SPEED_SAMPLES = 12;

// =============================================
// SECTION 3: STATE VARIABLES
// =============================================

// Arena size (read at runtime so it fills the window)
var ARENA_W = window.innerWidth;
var ARENA_H = window.innerHeight;

// Dial position and velocity
var dx = ARENA_W / 2;
var dy = ARENA_H / 2;
var dvx = 0;
var dvy = 0;

// Mouse position within arena (start at center)
var mx = ARENA_W / 2;
var my = ARENA_H / 2;

// Previous mouse position for speed calculation
var prevMx = mx;
var prevMy = my;

// Rolling average cursor speed
var speedSamples = [];
for (var i = 0; i < SPEED_SAMPLES; i++) { speedSamples.push(0); }
var speedIndex = 0;
var cursorSpeed = 0;

// Volume 0-100
var volume = 50;

// Interaction flags
var isCornered = false;
var isCalm     = false;
var isDragging = false;

// Drag tracking
var dragStartAngle  = 0;
var dragStartVolume = 0;

// Whether the mouse is inside the arena
var mouseInArena = false;

// =============================================
// SECTION 4: UTILITY FUNCTIONS
// =============================================

function dist(x1, y1, x2, y2) {
  var ax = x2 - x1;
  var ay = y2 - y1;
  return Math.sqrt(ax * ax + ay * ay);
}

function clamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

// Angle in radians from point 1 to point 2
function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Update rolling average of cursor speed
function updateCursorSpeed(px, py) {
  speedSamples[speedIndex] = dist(px, py, mx, my);
  speedIndex = (speedIndex + 1) % SPEED_SAMPLES;
  var total = 0;
  for (var s = 0; s < SPEED_SAMPLES; s++) { total += speedSamples[s]; }
  cursorSpeed = total / SPEED_SAMPLES;
}

// True if dial is near two walls at once (in a corner)
function checkCornered() {
  var nearLeft   = dx < WALL_PAD + CORNER_THRESHOLD;
  var nearRight  = dx > ARENA_W - WALL_PAD - CORNER_THRESHOLD;
  var nearTop    = dy < WALL_PAD + CORNER_THRESHOLD;
  var nearBottom = dy > ARENA_H - WALL_PAD - CORNER_THRESHOLD;
  return (nearLeft || nearRight) && (nearTop || nearBottom);
}

// =============================================
// SECTION 5: MOUSE EVENT HANDLERS
// =============================================

arena.addEventListener('mousemove', function(e) {
  prevMx = mx;
  prevMy = my;
  mx = e.clientX;
  my = e.clientY;
  mouseInArena = true;

  updateCursorSpeed(prevMx, prevMy);

  // While dragging, rotate the dial based on angle change
  if (isDragging) {
    var currentAngle = angleTo(dx, dy, mx, my);
    var angleDelta = currentAngle - dragStartAngle;
    // Full circle = 100 volume units
    var volumeDelta = (angleDelta / (2 * Math.PI)) * 100;
    volume = clamp(dragStartVolume + volumeDelta, 0, 100);
  }
});

arena.addEventListener('mouseleave', function() {
  mouseInArena = false;
  // Fill speed buffer with high values so dial doesn't think you're slow
  for (var s = 0; s < SPEED_SAMPLES; s++) { speedSamples[s] = 99; }
});

arena.addEventListener('mouseenter', function() {
  mouseInArena = true;
});

// Start drag only when dial is calm and cursor is close enough
arena.addEventListener('mousedown', function(e) {
  if (!isCalm) return;
  if (dist(mx, my, dx, dy) < DIAL_RADIUS + 15) {
    isDragging = true;
    dragStartAngle  = angleTo(dx, dy, mx, my);
    dragStartVolume = volume;
    e.preventDefault();
  }
});

arena.addEventListener('mouseup', function() {
  isDragging = false;
});

submitBtn.addEventListener('click', function() {
  alert('Volume set to ' + Math.round(volume) + '%');
});

// Update arena size if window is resized
window.addEventListener('resize', function() {
  ARENA_W = window.innerWidth;
  ARENA_H = window.innerHeight;
});

// =============================================
// SECTION 6: DIAL PHYSICS UPDATE
// =============================================

function updateDial() {
  if (isDragging) return;  // dial stays still while being turned

  var d = dist(mx, my, dx, dy);

  // Determine base behavior zone by distance
  var state = 'RELAXED';
  if      (d < PANIC_DIST)   state = 'PANIC';
  else if (d < CAUTION_DIST) state = 'CAUTION';
  else if (d < WATCH_DIST)   state = 'WATCHING';

  // CALM overrides everything if cornered + slow + close
  isCornered = checkCornered();
  isCalm = isCornered && (cursorSpeed < CALM_CURSOR_SPEED) && (d < CALM_APPROACH_DIST) && mouseInArena;
  if (isCalm) state = 'CALM';

  // Apply force for current state
  if (state === 'PANIC') {
    var angle = angleTo(mx, my, dx, dy);  // direction away from cursor
    // Scale force by how fast the cursor is moving - faster approach = faster escape
    var speedMultiplier = 1 + cursorSpeed * 0.18;
    dvx += Math.cos(angle) * PANIC_FORCE * speedMultiplier;
    dvy += Math.sin(angle) * PANIC_FORCE * speedMultiplier;

  } else if (state === 'CAUTION') {
    var angle2 = angleTo(mx, my, dx, dy);
    dvx += Math.cos(angle2) * CAUTION_FORCE;
    dvy += Math.sin(angle2) * CAUTION_FORCE;

  } else if (state === 'WATCHING') {
    var angle3 = angleTo(mx, my, dx, dy);
    dvx += Math.cos(angle3) * 0.03;
    dvy += Math.sin(angle3) * 0.03;

  // } else if (state === 'RELAXED') {
  //   // Drift back toward center
  //   dvx += (ARENA_W / 2 - dx) * RETURN_FORCE;
  //   dvy += (ARENA_H / 2 - dy) * RETURN_FORCE;

  } else if (state === 'CALM') {
    // Slow to a stop
    dvx *= 0.5;
    dvy *= 0.5;
  }

  // Apply friction and cap speed
  dvx *= FRICTION;
  dvy *= FRICTION;
  var speed = Math.sqrt(dvx * dvx + dvy * dvy);
  if (speed > MAX_SPEED) {
    dvx = (dvx / speed) * MAX_SPEED;
    dvy = (dvy / speed) * MAX_SPEED;
  }

  // Move dial
  dx += dvx;
  dy += dvy;

  // Bounce off walls
  if (dx < WALL_PAD)             { dx = WALL_PAD;             dvx =  Math.abs(dvx) * 0.4; }
  if (dx > ARENA_W - WALL_PAD)   { dx = ARENA_W - WALL_PAD;  dvx = -Math.abs(dvx) * 0.4; }
  if (dy < WALL_PAD)             { dy = WALL_PAD;             dvy =  Math.abs(dvy) * 0.4; }
  if (dy > ARENA_H - WALL_PAD)   { dy = ARENA_H - WALL_PAD;  dvy = -Math.abs(dvy) * 0.4; }
}

// =============================================
// SECTION 7: RENDER
// =============================================

function render() {
  // Move dial to its position
  dialEl.style.left = dx + 'px';
  dialEl.style.top  = dy + 'px';

  // Update volume readout
  volumeDisplay.textContent = Math.round(volume) + '%';

  // Rotate marker: volume 0-100 maps to -135deg to +135deg
  var rotation = (volume / 100) * 270 - 135;
  markerEl.style.transform = 'translateX(-50%) rotate(' + rotation + 'deg)';


}

// =============================================
// SECTION 8: MAIN LOOP
// =============================================

function gameLoop() {
  updateDial();
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
