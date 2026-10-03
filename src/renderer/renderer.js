// DOM Elements
const desktopStage = document.getElementById('desktop-stage');
const picoContainer = document.getElementById('pico-container');
const picoFacer = document.getElementById('pico-facer');
const picoFigure = document.getElementById('pico-figure');
const bubbleContainer = document.getElementById('bubble-container');
const picoInput = document.getElementById('pico-input');
const sendBtn = document.getElementById('send-btn');
const picoCharacter = document.getElementById('pico-character');
const picoHead = document.getElementById('pico-head');
const picoBody = document.getElementById('pico-body');
const picoEyesLeft = document.getElementById('pico-eyes-left');
const picoEyesRight = document.getElementById('pico-eyes-right');
const picoEyesDown = document.getElementById('pico-eyes-down');
const picoSideStand = document.getElementById('pico-side-stand');
const picoSideWalk1 = document.getElementById('pico-side-walk1');
const picoSideWalk2 = document.getElementById('pico-side-walk2');
const picoBlink = document.getElementById('pico-blink');

let isBubbleOpen = false;
let animationTimeout = null;

// Occasional Natural Idle Blink Controller
const IdleBlink = {
  timer: null,
  durationTimer: null,
  isBlinking: false,
  isPaused: false,

  start() {
    this.scheduleNext();
  },

  scheduleNext() {
    this.clearTimer();
    // Natural human irregular intervals: roughly 2.5s to 5.8s
    const intervalMs = Math.floor(2500 + Math.random() * 3300);
    this.timer = setTimeout(() => {
      this.blink();
    }, intervalMs);
  },

  blink() {
    if (this.isPaused || this.isBusy()) {
      this.scheduleNext();
      return;
    }

    this.isBlinking = true;
    picoContainer.classList.add('blinking');

    // Subtle, brief blink: normal human blink is ~120-140ms
    const blinkDurationMs = 130;
    this.durationTimer = setTimeout(() => {
      this.endBlink();

      // Occasional natural double-blink (15% probability)
      if (Math.random() < 0.15 && !this.isBusy() && !this.isPaused) {
        setTimeout(() => {
          if (!this.isBusy() && !this.isPaused) {
            picoContainer.classList.add('blinking');
            setTimeout(() => {
              this.endBlink();
              this.scheduleNext();
            }, 110);
          } else {
            this.scheduleNext();
          }
        }, 110);
      } else {
        this.scheduleNext();
      }
    }, blinkDurationMs);
  },

  blinkBriefly(durationMs = 120) {
    if (this.isPaused) return;
    this.endBlink();
    picoContainer.classList.add('blinking');
    this.durationTimer = setTimeout(() => {
      this.endBlink();
    }, durationMs);
  },

  endBlink() {
    this.isBlinking = false;
    picoContainer.classList.remove('blinking');
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }
  },

  isBusy() {
    const target = picoFigure || picoCharacter;
    if (!target) return false;
    return (
      target.classList.contains('reacting') ||
      target.classList.contains('acknowledging') ||
      target.classList.contains('walking') ||
      target.classList.contains('turning-to-side') ||
      target.classList.contains('turning-to-front') ||
      target.classList.contains('turning-around') ||
      (window.WanderController && (window.WanderController.isWalking || window.WanderController.isTurning)) ||
      (window.UserMovement && window.UserMovement.isMovingFromUser) ||
      isBubbleOpen
    );
  },

  // Immediately pause and cancel any active/pending blink during higher priority animations
  pauseAndOverride() {
    this.isPaused = true;
    this.endBlink();
    this.clearTimer();
  },

  resume() {
    this.isPaused = false;
    this.endBlink();
    this.scheduleNext();
  },

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
};

// Expose on window for automated verification and test coverage
window.IdleBlink = IdleBlink;

// Autonomous Idle Attention Controller (Natural, subtle looks & posture shifts)
const IdleAttention = {
  timer: null,
  restoreTimer: null,
  currentState: 'forward', // 'forward', 'glance-left', 'glance-right', 'glance-down', 'turn-left', 'turn-right', 'head-tilt', 'weight-shift'
  isUserEngaged: false,

  start() {
    this.scheduleNext();
  },

  scheduleNext() {
    this.clearTimers();
    if (this.isUserEngaged || this.isBusy()) {
      return;
    }

    // Irregular interval between autonomous shifts: 3.5s to 7.5s of quiet resting
    const quietIntervalMs = Math.floor(3500 + Math.random() * 4000);
    this.timer = setTimeout(() => {
      this.performAttentionShift();
    }, quietIntervalMs);
  },

  performAttentionShift() {
    if (this.isUserEngaged || this.isBusy()) {
      this.resetToForward();
      this.scheduleNext();
      return;
    }

    // Probability breakdown:
    // Primary behavior: Eye movement alone (~50%)
    // Secondary behavior: Combined eye movement + slight head turn (~25%)
    // Other occasional behaviors: glance down (~12%), tiny head tilt (~8%), subtle weight shift (~5%)
    const roll = Math.random();
    let nextState = 'forward';
    let durationMs = 1800;

    if (roll < 0.26) {
      nextState = 'glance-left';
      durationMs = Math.floor(1400 + Math.random() * 1000);
    } else if (roll < 0.52) {
      nextState = 'glance-right';
      durationMs = Math.floor(1400 + Math.random() * 1000);
    } else if (roll < 0.65) {
      nextState = 'turn-left';
      durationMs = Math.floor(2000 + Math.random() * 1200);
    } else if (roll < 0.78) {
      nextState = 'turn-right';
      durationMs = Math.floor(2000 + Math.random() * 1200);
    } else if (roll < 0.88) {
      nextState = 'glance-down';
      durationMs = Math.floor(1200 + Math.random() * 800);
    } else if (roll < 0.95) {
      nextState = 'head-tilt';
      durationMs = Math.floor(1500 + Math.random() * 1000);
    } else {
      nextState = 'weight-shift';
      durationMs = Math.floor(2200 + Math.random() * 1200);
    }

    this.applyState(nextState);

    // Return naturally to neutral forward resting
    this.restoreTimer = setTimeout(() => {
      this.resetToForward();
      this.scheduleNext();
    }, durationMs);
  },

  applyState(state) {
    this.currentState = state;
    this.clearStateClasses();

    if (!picoFigure) return;

    switch (state) {
      case 'glance-left':
        picoFigure.classList.add('gaze-left');
        break;
      case 'glance-right':
        picoFigure.classList.add('gaze-right');
        break;
      case 'glance-down':
        picoFigure.classList.add('gaze-down', 'head-down');
        break;
      case 'turn-left':
        picoFigure.classList.add('gaze-left', 'head-turn-left');
        break;
      case 'turn-right':
        picoFigure.classList.add('gaze-right', 'head-turn-right');
        break;
      case 'head-tilt':
        picoFigure.classList.add('head-tilt');
        break;
      case 'weight-shift':
        picoFigure.classList.add('weight-shift');
        break;
      case 'forward':
      default:
        break;
    }
  },

  clearStateClasses() {
    if (!picoFigure) return;
    picoFigure.classList.remove(
      'gaze-left', 'gaze-right', 'gaze-down',
      'head-turn-left', 'head-turn-right', 'head-tilt', 'head-down',
      'weight-shift'
    );
  },

  resetToForward() {
    this.currentState = 'forward';
    this.clearStateClasses();
  },

  onUserEngage() {
    this.isUserEngaged = true;
    this.clearTimers();
    this.resetToForward();
  },

  onUserDisengage(delayMs = 1500) {
    this.clearTimers();
    this.timer = setTimeout(() => {
      this.isUserEngaged = false;
      this.scheduleNext();
    }, delayMs);
  },

  isBusy() {
    const target = picoFigure || picoCharacter;
    if (!target) return false;
    return (
      target.classList.contains('reacting') ||
      target.classList.contains('acknowledging') ||
      target.classList.contains('walking') ||
      target.classList.contains('turning-to-side') ||
      target.classList.contains('turning-to-front') ||
      target.classList.contains('turning-around') ||
      (window.WanderController && (window.WanderController.isWalking || window.WanderController.isTurning)) ||
      (window.UserMovement && window.UserMovement.isMovingFromUser) ||
      isBubbleOpen
    );
  },

  clearTimers() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.restoreTimer) {
      clearTimeout(this.restoreTimer);
      this.restoreTimer = null;
    }
  }
};

window.IdleAttention = IdleAttention;

// Character Animation Controller (Clean visual isolation)
const CharacterActions = {
  // Playful bounce on click
  react() {
    this.playAnimation('reacting', 550);
  },

  // Subtle character nod + closed-eye acknowledgement to communicate "heard you"
  acknowledge() {
    IdleBlink.pauseAndOverride();
    IdleAttention.onUserEngage();

    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }

    const targets = [picoFigure, picoCharacter].filter(Boolean);
    targets.forEach(el => {
      el.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');
      void el.offsetWidth; // Force DOM reflow to restart CSS animation cleanly
      el.classList.add('acknowledging');
    });

    // Step 2 & 3: Eyes gently close in a warm blink during the nod (~200ms into the nod)
    setTimeout(() => {
      const isStillAck = targets.some(el => el.classList.contains('acknowledging'));
      if (isStillAck) {
        picoContainer.classList.add('blinking');
      }
    }, 200);

    // Step 4: Eyes softly reopen as the head begins rising back up (~480ms)
    setTimeout(() => {
      picoContainer.classList.remove('blinking');
    }, 480);

    // Step 5: Smoothly return to normal idle state at 800ms
    animationTimeout = setTimeout(() => {
      targets.forEach(el => {
        el.classList.remove('acknowledging');
        if (!window.WanderController || (!window.WanderController.isWalking && !window.WanderController.isTurning && !(window.UserMovement && window.UserMovement.isMovingFromUser))) {
          el.classList.add('idle');
        }
      });
      picoContainer.classList.remove('blinking');
      if (!isBubbleOpen && (!window.WanderController || (!window.WanderController.isWalking && !window.WanderController.isTurning && !(window.UserMovement && window.UserMovement.isMovingFromUser)))) {
        IdleBlink.resume();
        IdleAttention.onUserDisengage(1200);
      }
    }, 800);
  },

  // Small, character-like acknowledgement when cursor enters Pico's hit area
  glance() {
    if (this.isBusy()) return;
    IdleAttention.onUserEngage();
    this.playAnimation('glancing', 420);
    IdleBlink.blinkBriefly(120);
  },

  isBusy() {
    const target = picoFigure || picoCharacter;
    if (!target) return false;
    return (
      target.classList.contains('reacting') ||
      target.classList.contains('acknowledging') ||
      target.classList.contains('walking') ||
      target.classList.contains('turning-to-side') ||
      target.classList.contains('turning-to-front') ||
      target.classList.contains('turning-around') ||
      (window.WanderController && (window.WanderController.isWalking || window.WanderController.isTurning)) ||
      (window.UserMovement && window.UserMovement.isMovingFromUser) ||
      isBubbleOpen
    );
  },

  playAnimation(className, durationMs) {
    // Blinking pauses/overrides while higher-priority animations play
    if (className !== 'glancing') {
      IdleBlink.pauseAndOverride();
    }

    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }

    const targets = [picoFigure, picoCharacter].filter(Boolean);
    targets.forEach(el => {
      el.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');
      void el.offsetWidth; // Force DOM reflow to restart CSS animation cleanly
      el.classList.add(className);
    });

    animationTimeout = setTimeout(() => {
      targets.forEach(el => {
        el.classList.remove(className);
        if (!window.WanderController || !window.WanderController.isWalking) {
          el.classList.add('idle');
        }
      });
      if (!isBubbleOpen && (!window.WanderController || !window.WanderController.isWalking)) {
        IdleBlink.resume();
        IdleAttention.onUserDisengage(1200);
      }
    }, durationMs);
  }
};

window.CharacterActions = CharacterActions;

// Physical Surface Abstraction & World Coordinates System (Goal 2)
const SurfaceManager = {
  surfaces: new Map(),
  activeSurfaceId: 'taskbar-main',
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,

  init(surfacesData, initialSurfaceId = 'taskbar-main') {
    this.surfaces.clear();
    if (Array.isArray(surfacesData)) {
      surfacesData.forEach(s => this.register(s));
    } else if (surfacesData) {
      this.register(surfacesData);
    }
    this.activeSurfaceId = initialSurfaceId;
    this.updateDimensions();
  },

  updateDimensions() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
  },

  register(surface) {
    if (!surface || !surface.id) return;
    this.surfaces.set(surface.id, surface);
  },

  unregister(id) {
    return this.surfaces.delete(id);
  },

  get(id) {
    return this.surfaces.get(id) || null;
  },

  getActiveSurface() {
    return this.get(this.activeSurfaceId) || this.getHomeSurface();
  },

  setActiveSurface(id) {
    if (this.surfaces.has(id)) {
      this.activeSurfaceId = id;
      return true;
    }
    return false;
  },

  getHomeSurface() {
    for (const surface of this.surfaces.values()) {
      if (surface.isHome) return surface;
    }
    return this.get('taskbar-main') || null;
  },

  getAllSurfaces() {
    return Array.from(this.surfaces.values());
  },

  // Converts local X along a surface into stage translate coordinates { x, y }
  // y = 0 represents the baseline taskbar ledge (grounded at bottom: 1px)
  toCanvasCoords(surfaceId, localX) {
    const surface = this.get(surfaceId) || this.getHomeSurface();
    if (!surface) {
      return { x: Math.round(localX), y: 0 };
    }

    const homeElevation = this.getHomeSurface()?.elevation ?? this.canvasHeight;
    const targetElevation = surface.elevation ?? homeElevation;
    const deltaY = homeElevation - targetElevation;

    return {
      x: Math.round(localX),
      y: Math.round(-deltaY),
      surfaceElevation: targetElevation
    };
  }
};

window.SurfaceManager = SurfaceManager;

// World Coordinates Inspector
window.getPicoWorldCoords = () => {
  const surface = SurfaceManager.getActiveSurface();
  const canvasCoords = SurfaceManager.toCanvasCoords(WanderController.currentSurfaceId, WanderController.currentX);
  return {
    surfaceId: WanderController.currentSurfaceId,
    surfaceType: surface?.type ?? 'taskbar',
    surfaceLabel: surface?.label ?? 'Windows Taskbar',
    localX: WanderController.currentX,
    canvasX: canvasCoords.x,
    canvasY: canvasCoords.y,
    elevation: surface?.elevation ?? window.innerHeight,
    isHome: surface?.isHome ?? true,
    footDrift: 0
  };
};

// Autonomous Taskbar Wandering & Locomotion Controller
const WanderController = {
  currentSurfaceId: 'taskbar-main',
  currentX: 0,
  currentY: 0,
  minX: 0,
  maxX: 1200,
  isWalking: false,
  isTurning: false,
  currentFacing: 'right', // 'right' or 'left'
  wanderTimer: null,
  animFrameId: null,
  accumulatedDistance: 0,
  lastStepPhase: -1,
  currentGoal: null,

  async init() {
    let surfaceData = null;
    try {
      if (window.picoAPI?.getAllSurfaces) {
        const surfaces = await window.picoAPI.getAllSurfaces().catch(() => null);
        if (surfaces && surfaces.length > 0) {
          SurfaceManager.init(surfaces, 'taskbar-main');
          surfaceData = SurfaceManager.getActiveSurface();
        }
      }

      if (!surfaceData && window.picoAPI?.getTaskbarSurface) {
        const surface = await window.picoAPI.getTaskbarSurface().catch(() => null);
        if (surface) {
          SurfaceManager.init([{
            id: 'taskbar-main',
            type: 'taskbar',
            label: 'Windows Taskbar',
            bounds: surface.workArea || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
            walkableRange: { minX: surface.minX ?? 0, maxX: surface.maxX ?? Math.max(0, window.innerWidth - 38) },
            elevation: surface.ledgeY ?? window.innerHeight,
            isHome: true,
            defaultX: surface.defaultX ?? Math.round(window.innerWidth * 0.78)
          }], 'taskbar-main');
          surfaceData = SurfaceManager.getActiveSurface();
        }
      }
    } catch {
      // Fallback
    }

    if (!surfaceData) {
      SurfaceManager.init([{
        id: 'taskbar-main',
        type: 'taskbar',
        label: 'Windows Taskbar',
        bounds: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        walkableRange: { minX: 0, maxX: Math.max(0, window.innerWidth - 38) },
        elevation: window.innerHeight,
        isHome: true,
        defaultX: Math.round(window.innerWidth * 0.78)
      }], 'taskbar-main');
      surfaceData = SurfaceManager.getActiveSurface();
    }

    this.currentSurfaceId = surfaceData.id;
    const range = surfaceData.walkableRange || { minX: 0, maxX: Math.max(0, window.innerWidth - 38) };
    this.minX = range.minX;
    this.maxX = range.maxX;
    this.currentX = surfaceData.defaultX ?? Math.max(this.minX, this.maxX - 40);
    this.currentY = 0;

    this.setStagePosition(this.currentX, this.currentY);
    this.scheduleNextWander();
  },

  setStagePosition(x, y = 0) {
    this.currentX = Math.round(x);
    this.currentY = Math.round(y);
    if (desktopStage) {
      if (this.currentY === 0) {
        desktopStage.style.transform = `translateX(${this.currentX}px)`;
      } else {
        desktopStage.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
      }
      // Flip speech bubble to left side if within 240px of the right screen edge
      const shouldFlip = this.currentX > (this.maxX - 240);
      desktopStage.classList.toggle('bubble-flipped', shouldFlip);
    }
  },

  setStageX(x) {
    this.setStagePosition(x, this.currentY || 0);
  },

  scheduleNextWander() {
    this.clearWanderTimer();
    // Restrained, occasional wander: 22s to 45s between decisions
    const delayMs = Math.floor(22000 + Math.random() * 23000);
    this.wanderTimer = setTimeout(() => {
      this.maybeWander();
    }, delayMs);
  },

  clearWanderTimer() {
    if (this.wanderTimer) {
      clearTimeout(this.wanderTimer);
      this.wanderTimer = null;
    }
  },

  async executeGoal(goal) {
    if (!goal) return this.currentX;

    // Cancellation / Stop handling
    if (goal.type === 'CANCEL') {
      this.stop();
      return this.currentX;
    }

    // Preempt active autonomous walk if an explicit user movement command arrives
    if (this.isWalking && this.currentGoal?.source === 'autonomous' && goal.source === 'user') {
      this.stop();
    }

    const surface = SurfaceManager.get(goal.surfaceId || this.currentSurfaceId) || SurfaceManager.getActiveSurface();
    const minX = surface?.walkableRange?.minX ?? this.minX;
    const maxX = surface?.walkableRange?.maxX ?? this.maxX;

    const targetX = resolveMovementTarget(goal, this.currentX, minX, maxX);
    this.currentGoal = goal;

    const resultX = await this.walkTo(targetX, 36);
    this.currentGoal = null;
    return resultX;
  },

  maybeWander() {
    // If Pico is talking, being clicked, hovering, or user movement active: quietly postpone
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy() || UserMovement.isMovingFromUser || (this.currentGoal && this.currentGoal.source === 'user')) {
      this.scheduleNextWander();
      return;
    }

    // 40% probability to wander, 60% probability to remain quietly standing
    if (Math.random() < 0.60) {
      this.scheduleNextWander();
      return;
    }

    this.wander();
  },

  wander() {
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy() || UserMovement.isMovingFromUser) return;

    let dir = Math.random() < 0.5 ? 'left' : 'right';
    if (this.currentX - 80 < this.minX) {
      dir = 'right';
    } else if (this.currentX + 80 > this.maxX) {
      dir = 'left';
    }

    const goalType = Math.random() < 0.3 ? 'MEDIUM' : 'SHORT';
    const goal = new MovementGoal({
      type: goalType,
      direction: dir,
      source: 'autonomous'
    });

    this.executeGoal(goal);
  },

  // Turn from front-facing idle to side profile facing the given direction
  turnToSide(direction) {
    return new Promise((resolve) => {
      this.isTurning = true;
      this.currentFacing = direction;

      // Set facing class on facer
      if (direction === 'right') {
        picoFacer.classList.remove('facing-left');
        picoFacer.classList.add('facing-right');
      } else {
        picoFacer.classList.remove('facing-right');
        picoFacer.classList.add('facing-left');
      }

      picoFigure.classList.remove('idle', 'walking', 'turning-to-front', 'turning-around');
      void picoFigure.offsetWidth; // restart CSS transition
      picoFigure.classList.add('turning-to-side');

      // Mid-turn (75ms): switch from front sprite to side profile
      setTimeout(() => {
        picoFigure.classList.add('walking');
      }, 75);

      // End of turn (150ms): settle into side profile
      setTimeout(() => {
        picoFigure.classList.remove('turning-to-side');
        this.isTurning = false;
        resolve();
      }, 150);
    });
  },

  // Turn around when reversing direction while already walking
  turnAround(newDirection) {
    return new Promise((resolve) => {
      this.isTurning = true;
      this.clearStepAnimation();

      picoFigure.classList.remove('turning-to-side', 'turning-to-front');
      void picoFigure.offsetWidth;
      picoFigure.classList.add('turning-around');

      // Mid-turn (80ms): flip facing direction
      setTimeout(() => {
        this.currentFacing = newDirection;
        if (newDirection === 'right') {
          picoFacer.classList.remove('facing-left');
          picoFacer.classList.add('facing-right');
        } else {
          picoFacer.classList.remove('facing-right');
          picoFacer.classList.add('facing-left');
        }
      }, 80);

      // End of turn (160ms): resume walking in new direction
      setTimeout(() => {
        picoFigure.classList.remove('turning-around');
        this.isTurning = false;
        resolve();
      }, 160);
    });
  },

  // Turn from side profile back to front-facing idle stance
  turnToFront() {
    return new Promise((resolve) => {
      this.isTurning = true;
      this.clearStepAnimation();

      picoFigure.classList.remove('turning-to-side', 'turning-around');
      void picoFigure.offsetWidth;
      picoFigure.classList.add('turning-to-front');

      // Mid-turn (75ms): switch from side sprite to front sprite
      setTimeout(() => {
        picoFigure.classList.remove('walking');
        picoFigure.classList.add('idle');
      }, 75);

      // End of turn (150ms): settle into idle stance
      setTimeout(() => {
        picoFigure.classList.remove('turning-to-front');
        this.isTurning = false;
        resolve();
      }, 150);
    });
  },

  async walkTo(targetX, speedPxPerSec = 36) {
    if (this.isWalking) {
      this.stop();
    }

    targetX = Math.max(this.minX, Math.min(this.maxX, Math.round(targetX)));
    const startX = this.currentX;
    const totalDistance = targetX - startX;
    const absDistance = Math.abs(totalDistance);
    if (absDistance < 2) return Promise.resolve(this.currentX);

    this.clearWanderTimer();

    // Pause idle breathing, blinking, and attention shifts during walking
    IdleBlink.pauseAndOverride();
    IdleAttention.clearTimers();
    IdleAttention.clearStateClasses();
    picoFigure.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');

    const targetDirection = totalDistance > 0 ? 'right' : 'left';

    // 1. Turning: if idle front-facing, transition to side profile
    if (!picoFigure.classList.contains('walking')) {
      await this.turnToSide(targetDirection);
    } else if (this.currentFacing !== targetDirection) {
      // Reversing direction while already in side stance
      await this.turnAround(targetDirection);
    }

    this.isWalking = true;
    this.accumulatedDistance = 0;
    this.lastStepPhase = -1;
    this.updateStepAnimation();

    // Locomotion Kinematics:
    // Natural cruising speed of a calm, casual desktop resident (36 px/s).
    // Bounded acceleration and deceleration zones (12px each) so long journeys
    // cruise smoothly at full speed without multi-second creeping or stalling.
    const cruiseSpeed = Math.max(16, speedPxPerSec);
    const accelDist = Math.min(12, absDistance / 2);
    const decelDist = accelDist;

    let previousTime = performance.now();
    let travelledDist = 0;

    return new Promise((resolve) => {
      const step = async (currentTime) => {
        if (!this.isWalking) {
          resolve(this.currentX);
          return;
        }

        const dt = Math.min(0.05, (currentTime - previousTime) / 1000);
        previousTime = currentTime;

        // Kinematic velocity profile with subtle per-step weight transfer & effort:
        let baseSpeed;
        if (travelledDist < accelDist) {
          const p = Math.max(0, travelledDist / accelDist);
          baseSpeed = Math.max(12, cruiseSpeed * Math.sqrt(p));
        } else if (travelledDist > absDistance - decelDist) {
          const rem = Math.max(0, absDistance - travelledDist);
          const p = Math.max(0, rem / decelDist);
          baseSpeed = Math.max(8, cruiseSpeed * Math.sqrt(p));
        } else {
          baseSpeed = cruiseSpeed;
        }

        // Natural cadence & weight transfer modulation:
        // Decelerates slightly into foot plant (weight absorption), surges forward during push-off
        const stepProgress = (this.accumulatedDistance % 10) / 10;
        const strideMod = 1.0 - 0.20 * Math.cos(2 * Math.PI * stepProgress);
        const currentSpeed = baseSpeed * strideMod;

        const moveDelta = currentSpeed * dt;
        travelledDist = Math.min(absDistance, travelledDist + moveDelta);
        const newX = startX + (totalDistance > 0 ? travelledDist : -travelledDist);
        this.setStageX(newX);

        // Advance animation state strictly based on ground translation
        this.accumulatedDistance += moveDelta;
        this.updateStepAnimation();

        if (travelledDist < absDistance) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          this.setStageX(targetX);
          this.isWalking = false;
          this.clearStepAnimation();

          // Transition back to front-facing idle stance
          await this.turnToFront();

          if (!isBubbleOpen) {
            IdleBlink.resume();
            IdleAttention.onUserDisengage(1500);
          }

          this.scheduleNextWander();
          resolve(this.currentX);
        }
      };

      this.animFrameId = requestAnimationFrame(step);
    });
  },

  updateStepAnimation() {
    if (!this.isWalking) return;
    // Step cadence & rhythm:
    // Full 2-step cycle is 20px (10px per single step).
    // In each 10px step:
    // - Initial ~4.5px is Passing (legs pass under body, body reaches full vertical height)
    // - Next ~5.5px is Step Plant (foot strikes ground, heel of opposite foot lifts, body settles slightly with weight transfer)
    const cycleDist = this.accumulatedDistance % 20;
    let phase = 0;
    if (cycleDist < 4.5) {
      phase = 0; // Passing (before Step 1)
    } else if (cycleDist < 10) {
      phase = 1; // Step 1: Right foot lead plant, left foot heel lifted
    } else if (cycleDist < 14.5) {
      phase = 2; // Passing (before Step 2)
    } else {
      phase = 3; // Step 2: Left foot lead plant, right foot heel lifted
    }

    if (phase === this.lastStepPhase) return;
    this.lastStepPhase = phase;

    picoFigure.classList.remove('walk-step-1', 'walk-step-2', 'walk-passing');
    if (phase === 1) {
      picoFigure.classList.add('walk-step-1');
    } else if (phase === 3) {
      picoFigure.classList.add('walk-step-2');
    } else {
      picoFigure.classList.add('walk-passing');
    }
  },

  clearStepAnimation() {
    this.lastStepPhase = -1;
    picoFigure.classList.remove('walk-step-1', 'walk-step-2', 'walk-passing');
  },

  startStepCycle() {
    this.clearStepAnimation();
    this.updateStepAnimation();
  },

  stopStepCycle() {
    this.clearStepAnimation();
  },

  stop() {
    const wasActive = this.isWalking || this.isTurning;
    this.isWalking = false;
    this.isTurning = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.clearStepAnimation();

    // Immediately restore clean front-facing idle standing
    picoFigure.classList.remove('walking', 'turning-to-side', 'turning-to-front', 'turning-around');
    picoFigure.classList.add('idle');

    if (!isBubbleOpen) {
      IdleBlink.resume();
      IdleAttention.onUserDisengage(1500);
    }

    if (wasActive) {
      this.scheduleNextWander();
    }
  }
};

window.WanderController = WanderController;

// Open attached speech bubble
function openBubble() {
  if (WanderController.isWalking) {
    WanderController.stop();
  }
  IdleAttention.onUserEngage();
  isBubbleOpen = true;
  bubbleContainer.classList.add('open');
  picoCharacter.classList.add('happy');
  CharacterActions.react();

  // Allow interaction while bubble is open
  window.picoAPI?.setIgnoreMouseEvents(false);

  setTimeout(() => {
    picoInput.focus();
  }, 100);
}

// Close attached speech bubble
function closeBubble() {
  isBubbleOpen = false;
  bubbleContainer.classList.remove('open');
  picoCharacter.classList.remove('happy');
  picoInput.blur();

  // Re-enable click-through for desktop transparent areas
  window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });

  // Resume idle blinking and attention shifts
  IdleBlink.resume();
  IdleAttention.onUserDisengage(1200);

  // Schedule next quiet wander
  WanderController.scheduleNextWander();
}

// Toggle bubble on clicking Pico
function toggleBubble(e) {
  e.stopPropagation();
  if (WanderController.isWalking) {
    WanderController.stop();
  }
  if (isBubbleOpen) {
    closeBubble();
  } else {
    openBubble();
  }
}

// Unified Movement Goal Data Model (Goal 3)
class MovementGoal {
  constructor({
    type = 'SHORT',
    direction = null,
    source = 'user',
    targetX = null,
    surfaceId = null,
    interruptible = true
  }) {
    this.type = type; // 'SHORT' | 'MEDIUM' | 'LONG' | 'DESTINATION_EDGE' | 'OPPOSITE_EDGE' | 'MAX_EXTENT' | 'CONTINUOUS' | 'CLEAR_VIEW' | 'CANCEL' | 'directional'
    this.direction = direction; // 'left' | 'right' | null
    this.source = source; // 'user' | 'autonomous' | 'activity'
    this.targetX = targetX;
    this.surfaceId = surfaceId;
    this.interruptible = interruptible;
    this.createdAt = performance.now();
  }
}

window.MovementGoal = MovementGoal;

// Unified Movement Target Resolver
function resolveMovementTarget(goal, currentX, minX, maxX) {
  if (!goal) return currentX;

  if (goal.targetX !== null && goal.targetX !== undefined && !isNaN(goal.targetX)) {
    return Math.max(minX, Math.min(maxX, Math.round(goal.targetX)));
  }

  // Direction resolution (-1 = left, +1 = right)
  let dir = goal.direction === 'left' ? -1 : (goal.direction === 'right' ? 1 : 0);

  // If direction is unspecified and not an obstruction or cancellation, choose direction with more room
  if (dir === 0 && goal.type !== 'CANCEL' && goal.type !== 'CLEAR_VIEW' && goal.type !== 'OPPOSITE_EDGE') {
    const leftSpace = currentX - minX;
    const rightSpace = maxX - currentX;
    dir = rightSpace >= leftSpace ? 1 : -1;
  }

  switch (goal.type) {
    case 'CANCEL':
      return currentX;

    case 'SHORT':
    case 'directional': {
      // Default short scope (~80px, strictly preserving Milestone 2 baseline)
      const stepDistance = 80;
      return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
    }

    case 'MEDIUM': {
      // Medium scope ("walk a bit", "a little"): ~160px
      const stepDistance = 160;
      return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
    }

    case 'LONG': {
      // Long scope ("go far", "way right"): ~400px
      const stepDistance = 400;
      return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
    }

    case 'DESTINATION_EDGE': {
      // "Go to the right edge" / "walk to the left edge"
      return dir > 0 ? maxX : minX;
    }

    case 'OPPOSITE_EDGE': {
      // "Go to the other edge" / "opposite side"
      const mid = (minX + maxX) / 2;
      return currentX >= mid ? minX : maxX;
    }

    case 'MAX_EXTENT':
    case 'CONTINUOUS': {
      // "Walk all the way left/right", "Keep walking right"
      return dir > 0 ? maxX : minX;
    }

    case 'CLEAR_VIEW': {
      // "Get out of the way" / "blocking view": choose nearest unblocking spot
      const stepDistance = 110;
      const leftRoom = currentX - minX;
      const rightRoom = maxX - currentX;

      let clearDir = -1;
      if (leftRoom >= stepDistance && rightRoom >= stepDistance) {
        clearDir = -1; // Plenty of room: move left away from speech bubble
      } else if (leftRoom >= stepDistance) {
        clearDir = -1;
      } else if (rightRoom >= stepDistance) {
        clearDir = 1;
      } else {
        clearDir = rightRoom > leftRoom ? 1 : -1;
      }

      return Math.max(minX, Math.min(maxX, currentX + clearDir * stepDistance));
    }

    default:
      return Math.max(minX, Math.min(maxX, currentX + dir * 80));
  }
}

// User-Directed Locomotion Intent Controller
const UserMovement = {
  isMovingFromUser: false,

  parseCommand(input) {
    if (!input || typeof input !== 'string') return null;

    const text = input
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return null;

    // 1. Cancellation / Stop (preemption)
    if (/\b(stop|halt|wait|freeze|stay|hold on|don't move|dont move|pause)\b/.test(text)) {
      return { type: 'CANCEL', direction: null };
    }

    // 2. Opposite Edge
    if (/\b(other (?:side|edge)|opposite (?:side|edge))\b/.test(text)) {
      return { type: 'OPPOSITE_EDGE', direction: null };
    }

    const hasLeft = /\bleft\b/.test(text);
    const hasRight = /\bright\b/.test(text);
    let dir = null;
    if (hasLeft && !hasRight) dir = 'left';
    else if (hasRight && !hasLeft) dir = 'right';
    else if (hasLeft && hasRight) dir = text.lastIndexOf('left') > text.lastIndexOf('right') ? 'left' : 'right';

    // 3. Destination Edge / To the edge
    if (/\b(to the (?:right|left) edge|to the edge|to the end)\b/.test(text)) {
      return { type: 'DESTINATION_EDGE', direction: dir || (hasLeft ? 'left' : 'right') };
    }

    // 4. Max Extent / All the way
    if (/\b(all the way|as far as (?:you can|possible))\b/.test(text)) {
      return { type: 'MAX_EXTENT', direction: dir || (hasLeft ? 'left' : 'right') };
    }

    // 5. Continuous Walk
    if (/\b(keep (?:walking|going|moving|stepping)|continue (?:walking|going|moving))\b/.test(text)) {
      return { type: 'CONTINUOUS', direction: dir || (hasLeft ? 'left' : 'right') };
    }

    // 6. Obstruction / Clear View (when no explicit directional movement is requested)
    const isObstruction =
      /\b(out of (?:the |my )?way|in (?:the |my )?way|get out of (?:the |my )?way)\b/.test(text) ||
      /\b(move over|move aside|step aside|scoot over|scoot aside)\b/.test(text) ||
      /\b(blocking|obstructing|hiding)\b/.test(text) ||
      /\b(you'?re|you are)\s+(?:in\s+(?:the|my)\s+way|blocking)\b/.test(text) ||
      /\b(move|go|walk|get)\s+away\b/.test(text);

    if (isObstruction && !dir) {
      return { type: 'CLEAR_VIEW', direction: null };
    }

    // 7. Distance Scopes (Long, Medium, Short)
    const isMovementVerb = /\b(move|go|walk|step|head|shift|scoot|slide|turn|run)\b/.test(text);
    const isFar = /\b(far|a long way|a lot|way)\b/.test(text);
    const isMedium = /\b(a bit|a little|somewhat|a few steps|a step)\b/.test(text);

    if (isFar && (dir || isMovementVerb)) {
      return { type: 'LONG', direction: dir };
    }

    if (isMedium && (dir || isMovementVerb)) {
      return { type: 'MEDIUM', direction: dir };
    }

    if (dir || isMovementVerb || isObstruction) {
      return { type: 'SHORT', direction: dir };
    }

    return null;
  },

  calculateTarget(intent, currentX, minX, maxX) {
    return resolveMovementTarget(intent, currentX, minX, maxX);
  },

  async executeCommand(intent) {
    const goal = new MovementGoal({
      type: intent.type,
      direction: intent.direction,
      source: 'user'
    });

    this.isMovingFromUser = true;
    IdleAttention.onUserEngage();

    // Cancellation / Stop handling: immediate execution without delay
    if (goal.type === 'CANCEL') {
      closeBubble();
      await WanderController.executeGoal(goal);
      this.isMovingFromUser = false;
      IdleAttention.onUserDisengage(1500);
      return WanderController.currentX;
    }

    // Sequence:
    // 1. Let nod acknowledgement play (~700ms) to communicate "understood"
    await new Promise(r => setTimeout(r, 700));

    // 2. Smoothly close speech bubble
    closeBubble();

    // 3. Casually walk to target position via unified locomotion engine and return to idle
    const resultX = await WanderController.executeGoal(goal);
    this.isMovingFromUser = false;
    IdleAttention.onUserDisengage(1500);
    return resultX;
  }
};

window.UserMovement = UserMovement;

// Handle message send / acknowledgement & user-directed locomotion
function handleSend() {
  const text = picoInput.value.trim();
  if (!text) return Promise.resolve(null);

  picoInput.value = '';

  const movementIntent = UserMovement.parseCommand(text);

  // Visual character nod & acknowledgement (communicates "heard you / understood")
  CharacterActions.acknowledge();

  if (movementIntent) {
    return UserMovement.executeCommand(movementIntent);
  }

  return Promise.resolve(null);
}

window.submitUserText = async (text) => {
  picoInput.value = text;
  return await handleSend();
};

// Event Listeners
picoContainer.addEventListener('click', toggleBubble);

// Prevent clicks inside speech bubble from closing it
bubbleContainer.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Send on Enter
picoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSend();
  }
  if (e.key === 'Escape') {
    closeBubble();
  }
});

sendBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  handleSend();
});

// Click outside closes the bubble
window.addEventListener('click', (e) => {
  if (isBubbleOpen && !e.target.closest('#bubble-container') && !e.target.closest('#pico-container')) {
    closeBubble();
  }
});

// Mouse Event Pass-through handling for transparent window
// State-guarded to prevent IPC flooding and Win32 SetWindowLongPtr compositor stalls
let lastIgnoreState = null;
function setIgnoreMouseEvents(ignore, options) {
  if (lastIgnoreState === ignore) return;
  lastIgnoreState = ignore;
  window.picoAPI?.setIgnoreMouseEvents(ignore, options);
}

picoContainer.addEventListener('mouseenter', () => {
  setIgnoreMouseEvents(false);
  IdleAttention.onUserEngage();
  // Trigger character-like hover acknowledgement once per mouse-enter event
  if (!isBubbleOpen && !CharacterActions.isBusy()) {
    CharacterActions.glance();
  }
});

picoContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    setIgnoreMouseEvents(true, { forward: true });
    IdleAttention.onUserDisengage(1500);
  }
});

bubbleContainer.addEventListener('mouseenter', () => {
  setIgnoreMouseEvents(false);
});

bubbleContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    setIgnoreMouseEvents(true, { forward: true });
  }
});

window.addEventListener('mousemove', (e) => {
  const overPico = !!e.target.closest('#pico-container');
  const overBubble = !!e.target.closest('#bubble-container');
  if (overPico || (isBubbleOpen && overBubble)) {
    setIgnoreMouseEvents(false);
  } else if (!isBubbleOpen) {
    setIgnoreMouseEvents(true, { forward: true });
  }
});

// Initialize natural idle blink loop, autonomous attention controller, and wander controller
IdleBlink.start();
IdleAttention.start();
WanderController.init();

