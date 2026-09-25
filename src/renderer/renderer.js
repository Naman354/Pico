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

// Autonomous Taskbar Wandering & Locomotion Controller
const WanderController = {
  currentX: 0,
  minX: 30,
  maxX: 1200,
  isWalking: false,
  isTurning: false,
  currentFacing: 'right', // 'right' or 'left'
  wanderTimer: null,
  animFrameId: null,
  stepTimer: null,
  stepPhase: 0,

  async init() {
    try {
      if (window.picoAPI?.getTaskbarSurface) {
        const surface = await window.picoAPI.getTaskbarSurface().catch(() => null);
        if (surface) {
          this.minX = surface.minX ?? 30;
          this.maxX = surface.maxX ?? Math.max(300, window.innerWidth - 280);
          this.currentX = surface.defaultX ?? Math.max(this.minX, this.maxX - 40);
        } else {
          this.minX = 30;
          this.maxX = Math.max(300, window.innerWidth - 280);
          this.currentX = this.maxX - 40;
        }
      } else {
        this.minX = 30;
        this.maxX = Math.max(300, window.innerWidth - 280);
        this.currentX = this.maxX - 40;
      }
    } catch {
      this.minX = 30;
      this.maxX = Math.max(300, window.innerWidth - 280);
      this.currentX = this.maxX - 40;
    }

    this.setStageX(this.currentX);
    this.scheduleNextWander();
  },

  setStageX(x) {
    this.currentX = Math.round(x);
    if (desktopStage) {
      desktopStage.style.transform = `translateX(${this.currentX}px)`;
    }
  },

  scheduleNextWander() {
    this.clearWanderTimer();
    // Restrained, occasional wander: 20s to 42s between decisions
    const delayMs = Math.floor(20000 + Math.random() * 22000);
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

  maybeWander() {
    // If Pico is talking, being clicked, or hovering: quietly postpone
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy()) {
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
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy()) return;

    // Pick a gentle, short walk distance between 60px and 130px
    const distance = Math.floor(60 + Math.random() * 70);

    // Direction selection respecting boundaries
    let dir = Math.random() < 0.5 ? -1 : 1;
    if (this.currentX - distance < this.minX) {
      dir = 1;
    } else if (this.currentX + distance > this.maxX) {
      dir = -1;
    }

    let targetX = this.currentX + distance * dir;
    targetX = Math.max(this.minX, Math.min(this.maxX, targetX));

    if (Math.abs(targetX - this.currentX) < 20) {
      this.scheduleNextWander();
      return;
    }

    this.walkTo(targetX);
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
      this.stopStepCycle();

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
      this.stopStepCycle();

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

  async walkTo(targetX, speedPxPerSec = 28) {
    if (this.isWalking) {
      this.stop();
    }

    targetX = Math.max(this.minX, Math.min(this.maxX, Math.round(targetX)));
    const startX = this.currentX;
    const distance = targetX - startX;
    if (Math.abs(distance) < 2) return Promise.resolve(this.currentX);

    this.clearWanderTimer();

    // Pause idle breathing, blinking, and attention shifts during walking
    IdleBlink.pauseAndOverride();
    IdleAttention.clearTimers();
    IdleAttention.clearStateClasses();
    picoFigure.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');

    const targetDirection = distance > 0 ? 'right' : 'left';

    // 1. Turning: if idle front-facing, transition to side profile
    if (!picoFigure.classList.contains('walking')) {
      await this.turnToSide(targetDirection);
    } else if (this.currentFacing !== targetDirection) {
      // Reversing direction while already in side stance
      await this.turnAround(targetDirection);
    }

    this.isWalking = true;
    this.startStepCycle();

    const durationMs = Math.max(500, (Math.abs(distance) / speedPxPerSec) * 1000);
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = async (currentTime) => {
        if (!this.isWalking) {
          resolve(this.currentX);
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        // Gentle ease-in-out for starting and stopping naturally
        const easedProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newX = startX + distance * easedProgress;
        this.setStageX(newX);

        if (progress < 1) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          this.setStageX(targetX);
          this.isWalking = false;
          this.stopStepCycle();

          // 4. Stopping: naturally transition back to front-facing idle stance
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

  startStepCycle() {
    this.stopStepCycle();
    this.stepPhase = 0;
    // Step cadence: alternates every ~180ms between passing, step 1, passing, step 2
    // Full walk cycle = 720ms, perfectly synchronized with 0.72s CSS body sway
    this.stepTimer = setInterval(() => {
      if (!this.isWalking || this.isTurning) {
        this.stopStepCycle();
        return;
      }
      this.stepPhase = (this.stepPhase + 1) % 4;
      picoFigure.classList.remove('walk-step-1', 'walk-step-2');
      if (this.stepPhase === 1) {
        picoFigure.classList.add('walk-step-1');
      } else if (this.stepPhase === 3) {
        picoFigure.classList.add('walk-step-2');
      }
    }, 180);
  },

  stopStepCycle() {
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    picoFigure.classList.remove('walk-step-1', 'walk-step-2');
  },

  stop() {
    const wasActive = this.isWalking || this.isTurning;
    this.isWalking = false;
    this.isTurning = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopStepCycle();

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

    const hasLeft = /\bleft\b/.test(text);
    const hasRight = /\bright\b/.test(text);

    if (hasLeft && !hasRight) {
      const isLeftMovement = 
        /\b(move|go|walk|step|head|shift|scoot|slide|turn|run)\b.*?\bleft\b/.test(text) ||
        /\bleft\b.*?\b(side|please|now)\b/.test(text) ||
        /^(?:please\s+)?(?:move\s+)?left(?:\s+please)?$/.test(text);
      if (isLeftMovement) return { type: 'directional', direction: 'left' };
    }

    if (hasRight && !hasLeft) {
      const isRightMovement = 
        /\b(move|go|walk|step|head|shift|scoot|slide|turn|run)\b.*?\bright\b/.test(text) ||
        /\bright\b.*?\b(side|please|now)\b/.test(text) ||
        /^(?:please\s+)?(?:move\s+)?right(?:\s+please)?$/.test(text);
      if (isRightMovement) return { type: 'directional', direction: 'right' };
    }

    if (hasLeft && hasRight) {
      const lastLeft = text.lastIndexOf('left');
      const lastRight = text.lastIndexOf('right');
      return { type: 'directional', direction: lastLeft > lastRight ? 'left' : 'right' };
    }

    const isObstruction = 
      /\b(out of (?:the |my )?way|in (?:the |my )?way|get out of (?:the |my )?way)\b/.test(text) ||
      /\b(move over|move aside|step aside|scoot over|scoot aside)\b/.test(text) ||
      /\b(blocking|obstructing|hiding)\b/.test(text) ||
      /\b(you'?re|you are)\s+(?:in\s+(?:the|my)\s+way|blocking)\b/.test(text) ||
      /\b(move|go|walk|get)\s+away\b/.test(text) ||
      /^(?:please\s+)?(?:move|scoot|step)(?:\s+over|\s+aside|\s+please)?$/.test(text) ||
      /\b(can you|could you|please)\s+(?:move|step aside|scoot)\b/.test(text);

    if (isObstruction) return { type: 'clear_view' };
    return null;
  },

  calculateTarget(intent, currentX, minX, maxX) {
    const stepDistance = 80;
    if (intent.type === 'directional') {
      if (intent.direction === 'left') {
        return Math.max(minX, currentX - stepDistance);
      } else {
        return Math.min(maxX, currentX + stepDistance);
      }
    }

    // "Move out of the way" / clear view:
    // Prefer moving to the nearest reasonable side (clear immediate obstruction)
    const leftRoom = currentX - minX;
    const rightRoom = maxX - currentX;

    let dir = -1;
    if (leftRoom >= stepDistance && rightRoom >= stepDistance) {
      dir = -1; // Plenty of room: move left (away from speech bubble)
    } else if (leftRoom >= stepDistance) {
      dir = -1;
    } else if (rightRoom >= stepDistance) {
      dir = 1;
    } else {
      dir = rightRoom > leftRoom ? 1 : -1;
    }

    return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
  },

  async executeCommand(intent) {
    const targetX = this.calculateTarget(
      intent,
      WanderController.currentX,
      WanderController.minX,
      WanderController.maxX
    );

    this.isMovingFromUser = true;
    IdleAttention.onUserEngage();

    // Sequence:
    // 1. Let nod acknowledgement play (~700ms) to communicate "understood"
    await new Promise(r => setTimeout(r, 700));

    // 2. Smoothly close speech bubble
    closeBubble();

    // 3. Casually walk to target position and return to idle
    const resultX = await WanderController.walkTo(targetX, 28);
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
picoContainer.addEventListener('mouseenter', () => {
  window.picoAPI?.setIgnoreMouseEvents(false);
  if (WanderController.isWalking) {
    WanderController.stop();
  }
  IdleAttention.onUserEngage();
  // Trigger character-like hover acknowledgement once per mouse-enter event
  if (!isBubbleOpen && !CharacterActions.isBusy()) {
    CharacterActions.glance();
  }
});

picoContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });
    IdleAttention.onUserDisengage(1500);
  }
});

bubbleContainer.addEventListener('mouseenter', () => {
  window.picoAPI?.setIgnoreMouseEvents(false);
});

bubbleContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });
  }
});

window.addEventListener('mousemove', (e) => {
  const overPico = !!e.target.closest('#pico-container');
  const overBubble = !!e.target.closest('#bubble-container');
  if (overPico || (isBubbleOpen && overBubble)) {
    window.picoAPI?.setIgnoreMouseEvents(false);
  } else if (!isBubbleOpen) {
    window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });
  }
});

// Initialize natural idle blink loop, autonomous attention controller, and wander controller
IdleBlink.start();
IdleAttention.start();
WanderController.init();

